import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getAppUrl } from "@/lib/utils";
import { stripe } from "@/lib/stripe";
import {
  ensureStripeProduct,
  getOrCreateStripeCustomer,
  activateSubscriptionFromStripe,
} from "@/lib/stripe-subscriptions";
import type Stripe from "stripe";

const checkoutSchema = z.object({
  apiProductId: z.string(),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = checkoutSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let api = await prisma.apiProduct.findUnique({
      where: { id: data.apiProductId, isActive: true },
    });
    if (!api) {
      return NextResponse.json({ error: "API not found" }, { status: 404 });
    }

    const existing = await prisma.subscription.findUnique({
      where: {
        userId_apiProductId: {
          userId: user.id,
          apiProductId: api.id,
        },
      },
    });

    if (existing?.status === "ACTIVE" && existing.expiresAt > new Date()) {
      return NextResponse.json(
        { error: "Already subscribed to this API" },
        { status: 400 }
      );
    }

    api = await ensureStripeProduct(api);
    const stripeCustomerId = await getOrCreateStripeCustomer(user);

    const priceId =
      data.billingCycle === "MONTHLY"
        ? api.stripePriceMonthlyId!
        : api.stripePriceYearlyId!;

    const price =
      data.billingCycle === "MONTHLY" ? api.priceMonthly : api.priceYearly;

    const appUrl = getAppUrl();

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/subscriptions?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/apis?checkout=cancelled`,
      metadata: {
        userId: user.id,
        apiProductId: api.id,
        billingCycle: data.billingCycle,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          apiProductId: api.id,
          billingCycle: data.billingCycle,
        },
      },
    });

    const placeholderExpiry = new Date();
    placeholderExpiry.setDate(placeholderExpiry.getDate() + 1);

    await prisma.subscription.upsert({
      where: {
        userId_apiProductId: {
          userId: user.id,
          apiProductId: api.id,
        },
      },
      create: {
        userId: user.id,
        apiProductId: api.id,
        status: "PENDING",
        billingCycle: data.billingCycle,
        price,
        expiresAt: placeholderExpiry,
      },
      update: {
        status: "PENDING",
        billingCycle: data.billingCycle,
        price,
        cancelledAt: null,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (checkoutSession.metadata?.userId !== session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (checkoutSession.payment_status !== "paid") {
      return NextResponse.json({ status: "pending" });
    }

    const stripeSubscription = checkoutSession.subscription as Stripe.Subscription;
    if (!stripeSubscription || typeof stripeSubscription === "string") {
      return NextResponse.json({ status: "pending" });
    }

    const userId = checkoutSession.metadata.userId;
    const apiProductId = checkoutSession.metadata.apiProductId;
    const billingCycle = checkoutSession.metadata.billingCycle as
      | "MONTHLY"
      | "YEARLY";

    const subscription = await activateSubscriptionFromStripe(
      stripeSubscription,
      userId,
      apiProductId,
      billingCycle
    );

    const full = await prisma.subscription.findUnique({
      where: { id: subscription.id },
      include: { apiProduct: true },
    });

    return NextResponse.json({ status: "complete", subscription: full });
  } catch (error) {
    console.error("Session verify error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
