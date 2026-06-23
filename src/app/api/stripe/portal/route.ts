import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getAppUrl } from "@/lib/utils";
import { isErrorResponse, jsonError, requireSession } from "@/lib/api-helpers";

export async function POST() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user?.stripeCustomerId) {
    return jsonError("No billing account found");
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${getAppUrl()}/dashboard/subscriptions`,
  });

  return NextResponse.json({ url: portalSession.url });
}
