import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isErrorResponse,
  jsonError,
  requireAdmin,
} from "@/lib/api-helpers";
import { getUsageSummary } from "@/lib/rate-limit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      company: true,
      role: true,
      emailVerifiedAt: true,
      stripeCustomerId: true,
      createdAt: true,
      subscriptions: {
        include: { apiProduct: { select: { name: true, slug: true } } },
        orderBy: { createdAt: "desc" },
      },
      apiTokens: {
        where: { isActive: true },
        include: { apiProduct: { select: { name: true, slug: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) return jsonError("User not found", 404);

  const usage = await getUsageSummary(id, 30);

  return NextResponse.json({ user, usage });
}
