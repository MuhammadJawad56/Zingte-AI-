import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/utils";
import { stripe } from "@/lib/stripe";
import { activeSubscriptionWhere } from "@/lib/subscriptions";
import {
  handleRouteError,
  isErrorResponse,
  jsonError,
  parseBody,
  requireSession,
} from "@/lib/api-helpers";
import { checkoutSchema } from "@/lib/validators";
import {
  ensureStripeProduct,
  getOrCreateStripeCustomer,
  activateSubscriptionFromStripe,
} from "@/lib/stripe-subscriptions";
import type Stripe from "stripe";

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const data = await parseBody(request, checkoutSchema);
  if (isErrorResponse(data)) return data;

  try {
    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) return jsonError("User not found", 404);

    let api = await prisma.apiProduct.findUnique({
      where: { id: data.apiProductId, isActive: true },
    });
    if (!api) return jsonError("API not found", 404);

    const existing = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        apiProductId: api.id,
        ...activeSubscriptionWhere(),
      },
    });

    if (existing) {
      return jsonError("Already subscribed to this API");
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
    return handleRouteError(error, "Failed to create checkout session");
  }
}

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) return jsonError("Missing session_id");

  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (checkoutSession.metadata?.userId !== session.id) {
      return jsonError("Unauthorized", 401);
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
    return handleRouteError(error, "Verification failed");
  }
}
