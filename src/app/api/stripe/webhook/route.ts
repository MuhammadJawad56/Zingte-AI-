import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import {
  activateSubscriptionFromStripe,
  getStripeSubscriptionPeriod,
  getInvoiceSubscriptionId,
} from "@/lib/stripe-subscriptions";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const existing = await prisma.webhookEvent.findUnique({
      where: { stripeEventId: event.id },
    });
    if (existing) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        if (checkoutSession.mode !== "subscription") break;

        const userId = checkoutSession.metadata?.userId;
        const apiProductId = checkoutSession.metadata?.apiProductId;
        const billingCycle = checkoutSession.metadata?.billingCycle as
          | "MONTHLY"
          | "YEARLY"
          | undefined;

        if (!userId || !apiProductId || !billingCycle) break;

        const subId = checkoutSession.subscription as string;
        const stripeSub = await stripe.subscriptions.retrieve(subId);

        await activateSubscriptionFromStripe(
          stripeSub,
          userId,
          apiProductId,
          billingCycle
        );
        break;
      }

      case "customer.subscription.updated": {
        const stripeSub = event.data.object as Stripe.Subscription;
        const local = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: stripeSub.id },
        });
        if (!local) break;

        const isActive =
          stripeSub.status === "active" || stripeSub.status === "trialing";
        const isCancelled = stripeSub.cancel_at_period_end;
        const { periodEnd } = getStripeSubscriptionPeriod(stripeSub);

        await prisma.subscription.update({
          where: { id: local.id },
          data: {
            status: isActive ? "ACTIVE" : "EXPIRED",
            expiresAt: new Date(periodEnd * 1000),
            cancelledAt: isCancelled
              ? local.cancelledAt || new Date()
              : null,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: stripeSub.id },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
          },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = getInvoiceSubscriptionId(invoice);
        if (!subId) break;

        const stripeSub = await stripe.subscriptions.retrieve(subId);
        if (stripeSub.status === "past_due" || stripeSub.status === "unpaid") {
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subId },
            data: { status: "EXPIRED" },
          });
        }
        break;
      }
    }

    await prisma.webhookEvent.create({
      data: {
        stripeEventId: event.id,
        type: event.type,
      },
    });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
