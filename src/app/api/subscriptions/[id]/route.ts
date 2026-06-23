import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isErrorResponse,
  jsonError,
  requireSession,
} from "@/lib/api-helpers";
import { cancelStripeSubscription } from "@/lib/stripe-subscriptions";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const subscription = await prisma.subscription.findUnique({
    where: { id },
    include: {
      apiProduct: true,
      user:
        session.role === "ADMIN"
          ? { select: { id: true, name: true, email: true, company: true } }
          : false,
    },
  });

  if (!subscription) return jsonError("Not found", 404);
  if (session.role !== "ADMIN" && subscription.userId !== session.id) {
    return jsonError("Unauthorized", 401);
  }

  return NextResponse.json(subscription);
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const subscription = await prisma.subscription.findUnique({ where: { id } });

  if (!subscription) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (session.role !== "ADMIN" && subscription.userId !== session.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (subscription.stripeSubscriptionId) {
    await cancelStripeSubscription(subscription.stripeSubscriptionId);
  }

  await prisma.subscription.update({
    where: { id },
    data: {
      cancelledAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    message: subscription.stripeSubscriptionId
      ? "Subscription will cancel at the end of the billing period"
      : "Subscription cancelled",
  });
}
