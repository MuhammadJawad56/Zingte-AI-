import type { Prisma, Subscription } from "@prisma/client";

export function activeSubscriptionWhere(
  userId?: string
): Prisma.SubscriptionWhereInput {
  return {
    status: "ACTIVE",
    expiresAt: { gt: new Date() },
    ...(userId ? { userId } : {}),
  };
}

export function isActiveSubscription(
  sub: Pick<Subscription, "status" | "expiresAt">
): boolean {
  return sub.status === "ACTIVE" && sub.expiresAt > new Date();
}
