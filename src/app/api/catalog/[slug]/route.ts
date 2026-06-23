import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isErrorResponse,
  jsonError,
  requireSession,
  serializeApiProduct,
} from "@/lib/api-helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { slug } = await params;

  const api = await prisma.apiProduct.findUnique({ where: { slug } });
  if (!api || !api.isActive) {
    return jsonError("API not found", 404);
  }

  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: session.id,
      apiProductId: api.id,
      status: "ACTIVE",
      expiresAt: { gt: new Date() },
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

  return NextResponse.json({
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
}
