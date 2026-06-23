import { Router } from "express";
import { prisma } from "../lib/prisma";
import { jsonError, requireSession } from "../lib/api-helpers";
import { cancelStripeSubscription } from "../lib/stripe-subscriptions";

const router = Router();

router.get("/", async (req, res) => {
  const session = await requireSession(req, res);
  if (!session) return;

  const where = session.role === "ADMIN" ? {} : { userId: session.id };

  const subscriptions = await prisma.subscription.findMany({
    where,
    include: {
      apiProduct: true,
      user:
        session.role === "ADMIN"
          ? { select: { id: true, name: true, email: true, company: true } }
          : false,
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json(subscriptions);
});

router.get("/:id", async (req, res) => {
  const session = await requireSession(req, res);
  if (!session) return;

  const subscription = await prisma.subscription.findUnique({
    where: { id: req.params.id },
    include: {
      apiProduct: true,
      user:
        session.role === "ADMIN"
          ? { select: { id: true, name: true, email: true, company: true } }
          : false,
    },
  });

  if (!subscription) return jsonError(res, "Not found", 404);
  if (session.role !== "ADMIN" && subscription.userId !== session.id) {
    return jsonError(res, "Forbidden", 403);
  }

  return res.json(subscription);
});

router.patch("/:id", async (req, res) => {
  const session = await requireSession(req, res);
  if (!session) return;

  const subscription = await prisma.subscription.findUnique({
    where: { id: req.params.id },
  });

  if (!subscription) return jsonError(res, "Not found", 404);
  if (session.role !== "ADMIN" && subscription.userId !== session.id) {
    return jsonError(res, "Forbidden", 403);
  }

  if (subscription.stripeSubscriptionId) {
    await cancelStripeSubscription(subscription.stripeSubscriptionId);
  }

  await prisma.subscription.update({
    where: { id: req.params.id },
    data: { cancelledAt: new Date() },
  });

  return res.json({
    success: true,
    message: subscription.stripeSubscriptionId
      ? "Subscription will cancel at the end of the billing period"
      : "Subscription cancelled",
  });
});

export default router;
