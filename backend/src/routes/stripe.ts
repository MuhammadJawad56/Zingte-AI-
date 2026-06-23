import { Router } from "express";
import type Stripe from "stripe";
import { prisma } from "../lib/prisma";
import { getStripe, isStripeConfigured } from "../lib/stripe";
import { activeSubscriptionWhere } from "../lib/subscriptions";
import {
  handleRouteError,
  jsonError,
  parseBody,
  requireSession,
} from "../lib/api-helpers";
import { checkoutSchema } from "../lib/validators";
import {
  ensureStripeProduct,
  getOrCreateStripeCustomer,
  activateSubscriptionFromStripe,
  getStripeSubscriptionPeriod,
  getInvoiceSubscriptionId,
} from "../lib/stripe-subscriptions";
import { getFrontendUrl } from "../lib/utils";

const router = Router();

function requireStripe(res: import("express").Response) {
  if (!isStripeConfigured()) {
    jsonError(res, "Stripe is not configured on this server", 503);
    return false;
  }
  return true;
}

router.post("/checkout", async (req, res) => {
  if (!requireStripe(res)) return;
  const session = await requireSession(req, res);
  if (!session) return;

  try {
  const data = parseBody(req, res, checkoutSchema);
  if (!data) return;
    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) return jsonError(res, "User not found", 404);

    let api = await prisma.apiProduct.findUnique({
      where: { id: data.apiProductId, isActive: true },
    });
    if (!api) return jsonError(res, "API not found", 404);

    const existing = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        apiProductId: api.id,
        ...activeSubscriptionWhere(),
      },
    });

    if (existing) {
      return jsonError(res, "Already subscribed to this API");
    }

    api = await ensureStripeProduct(api);
    const stripeCustomerId = await getOrCreateStripeCustomer(user);

    const priceId =
      data.billingCycle === "MONTHLY"
        ? api.stripePriceMonthlyId!
        : api.stripePriceYearlyId!;

    const price =
      data.billingCycle === "MONTHLY" ? api.priceMonthly : api.priceYearly;

    const appUrl = getFrontendUrl();

    const checkoutSession = await getStripe().checkout.sessions.create({
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

    return res.json({ url: checkoutSession.url });
  } catch (error) {
    return handleRouteError(res, error, "Failed to create checkout session");
  }
});

router.get("/checkout", async (req, res) => {
  if (!requireStripe(res)) return;
  const session = await requireSession(req, res);
  if (!session) return;

  const sessionId = req.query.session_id as string | undefined;
  if (!sessionId) return jsonError(res, "Missing session_id");

  try {
    const checkoutSession = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (checkoutSession.metadata?.userId !== session.id) {
      return jsonError(res, "Unauthorized", 401);
    }

    if (checkoutSession.payment_status !== "paid") {
      return res.json({ status: "pending" });
    }

    const stripeSubscription = checkoutSession.subscription as Stripe.Subscription;
    if (!stripeSubscription || typeof stripeSubscription === "string") {
      return res.json({ status: "pending" });
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

    return res.json({ status: "complete", subscription: full });
  } catch (error) {
    return handleRouteError(res, error, "Verification failed");
  }
});

router.post("/portal", async (req, res) => {
  if (!requireStripe(res)) return;
  const session = await requireSession(req, res);
  if (!session) return;

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user?.stripeCustomerId) {
    return jsonError(res, "No billing account found");
  }

  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${getFrontendUrl()}/dashboard/subscriptions`,
  });

  return res.json({ url: portalSession.url });
});

router.post("/webhook", async (req, res) => {
  if (!requireStripe(res)) return;
  const body = req.body as Buffer;
  const signature = req.headers["stripe-signature"] as string | undefined;

  if (!signature) {
    return res.status(400).json({ error: "Missing signature" });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return res.status(500).json({ error: "Webhook not configured" });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return res.status(400).json({ error: "Invalid signature" });
  }

  try {
    const existing = await prisma.webhookEvent.findUnique({
      where: { stripeEventId: event.id },
    });
    if (existing) {
      return res.json({ received: true, duplicate: true });
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
        const stripeSub = await getStripe().subscriptions.retrieve(subId);

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

        const stripeSub = await getStripe().subscriptions.retrieve(subId);
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
    return res.status(500).json({ error: "Handler failed" });
  }

  return res.json({ received: true });
});

export default router;
