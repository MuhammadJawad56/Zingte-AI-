import { prisma } from "./prisma";
import { activeSubscriptionWhere } from "./subscriptions";

export async function expireStaleSubscriptions() {
  const now = new Date();

  const expired = await prisma.subscription.updateMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lt: now },
      stripeSubscriptionId: null,
    },
    data: { status: "EXPIRED" },
  });

  const pending = await prisma.subscription.updateMany({
    where: {
      status: "PENDING",
      createdAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    },
    data: { status: "EXPIRED" },
  });

  return {
    expiredActive: expired.count,
    expiredPending: pending.count,
  };
}

export async function getAdminStats() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    apiCount,
    customerCount,
    activeSubs,
    revenue,
    usageLast30Days,
    newCustomers,
    recentSubs,
  ] = await Promise.all([
    prisma.apiProduct.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.subscription.count({ where: activeSubscriptionWhere() }),
    prisma.subscription.aggregate({
      where: activeSubscriptionWhere(),
      _sum: { price: true },
    }),
    prisma.apiUsageLog.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({
      where: { role: "CUSTOMER", createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.subscription.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true, company: true } },
        apiProduct: { select: { name: true, slug: true } },
      },
    }),
  ]);

  return {
    apis: apiCount,
    customers: customerCount,
    activeSubscriptions: activeSubs,
    totalRevenue: revenue._sum.price || 0,
    usageLast30Days,
    newCustomersLast30Days: newCustomers,
    recentSubscriptions: recentSubs,
  };
}
