import { prisma } from "./prisma";

const HOUR_MS = 60 * 60 * 1000;

export async function checkRateLimit(
  apiTokenId: string,
  apiProductId: string,
  limitPerHour: number
): Promise<{ allowed: boolean; used: number; limit: number; resetsAt: Date }> {
  const windowStart = new Date(Date.now() - HOUR_MS);

  const used = await prisma.apiUsageLog.count({
    where: {
      apiTokenId,
      apiProductId,
      createdAt: { gte: windowStart },
      statusCode: { lt: 500 },
    },
  });

  const oldestInWindow = await prisma.apiUsageLog.findFirst({
    where: {
      apiTokenId,
      createdAt: { gte: windowStart },
    },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  const resetsAt = oldestInWindow
    ? new Date(oldestInWindow.createdAt.getTime() + HOUR_MS)
    : new Date(Date.now() + HOUR_MS);

  return {
    allowed: used < limitPerHour,
    used,
    limit: limitPerHour,
    resetsAt,
  };
}

export async function getUsageSummary(userId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [total, byApi, recent] = await Promise.all([
    prisma.apiUsageLog.count({
      where: { userId, createdAt: { gte: since } },
    }),
    prisma.apiUsageLog.groupBy({
      by: ["apiProductId"],
      where: { userId, createdAt: { gte: since } },
      _count: { id: true },
      _avg: { latencyMs: true },
    }),
    prisma.apiUsageLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        apiProduct: { select: { name: true, slug: true } },
        apiToken: { select: { name: true, tokenPrefix: true } },
      },
    }),
  ]);

  const apiIds = byApi.map((b) => b.apiProductId);
  const products = await prisma.apiProduct.findMany({
    where: { id: { in: apiIds } },
    select: { id: true, name: true, slug: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  return {
    periodDays: days,
    totalRequests: total,
    byApi: byApi.map((b) => ({
      apiProduct: productMap.get(b.apiProductId),
      requests: b._count.id,
      avgLatencyMs: b._avg.latencyMs ? Math.round(b._avg.latencyMs) : null,
    })),
    recent,
  };
}
