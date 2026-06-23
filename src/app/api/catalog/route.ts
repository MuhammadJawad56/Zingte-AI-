import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { activeSubscriptionWhere } from "@/lib/subscriptions";
import {
  isErrorResponse,
  requireSession,
  serializeApiProduct,
} from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const category = request.nextUrl.searchParams.get("category");
  const search = request.nextUrl.searchParams.get("q");

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

  return NextResponse.json({
    total: apis.length,
    categories,
    apis: apis.map((api) => ({
      ...serializeApiProduct(api),
      isSubscribed: subscribedIds.has(api.id),
    })),
  });
}
