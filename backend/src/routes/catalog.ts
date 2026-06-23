import { Router } from "express";
import { prisma } from "../lib/prisma";
import { activeSubscriptionWhere } from "../lib/subscriptions";
import {
  jsonError,
  requireSession,
  serializeApiProduct,
} from "../lib/api-helpers";

const router = Router();

router.get("/", async (req, res) => {
  const session = await requireSession(req, res);
  if (!session) return;

  const category = req.query.category as string | undefined;
  const search = req.query.q as string | undefined;

  const apis = await prisma.apiProduct.findMany({
    where: {
      isActive: true,
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { description: { contains: search } },
              { category: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  let subscribedIds = new Set<string>();
  if (session.role === "CUSTOMER" || session.role === "ADMIN") {
    const subs = await prisma.subscription.findMany({
      where: { userId: session.id, ...activeSubscriptionWhere() },
      select: { apiProductId: true },
    });
    subscribedIds = new Set(subs.map((s) => s.apiProductId));
  }

  const categories = [...new Set(apis.map((a) => a.category))].sort();

  return res.json({
    total: apis.length,
    categories,
    apis: apis.map((api) => ({
      ...serializeApiProduct(api),
      isSubscribed: subscribedIds.has(api.id),
    })),
  });
});

router.get("/:slug", async (req, res) => {
  const session = await requireSession(req, res);
  if (!session) return;

  const api = await prisma.apiProduct.findUnique({
    where: { slug: req.params.slug },
  });
  if (!api || !api.isActive) {
    return jsonError(res, "API not found", 404);
  }

  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: session.id,
      apiProductId: api.id,
      ...activeSubscriptionWhere(),
    },
  });

  const tokenCount = subscription
    ? await prisma.apiToken.count({
        where: {
          userId: session.id,
          apiProductId: api.id,
          isActive: true,
        },
      })
    : 0;

  return res.json({
    ...serializeApiProduct(api),
    subscription: subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          billingCycle: subscription.billingCycle,
          price: subscription.price,
          expiresAt: subscription.expiresAt,
        }
      : null,
    activeTokens: tokenCount,
  });
});

export default router;
