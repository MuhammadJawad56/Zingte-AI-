import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { activeSubscriptionWhere } from "@/lib/subscriptions";
import {
  isErrorResponse,
  jsonError,
  jsonSuccess,
  parseBody,
  requireSession,
} from "@/lib/api-helpers";
import { changePasswordSchema } from "@/lib/validators";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  company: z.string().nullable().optional(),
});

export async function GET() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      name: true,
      company: true,
      role: true,
      emailVerifiedAt: true,
      stripeCustomerId: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          subscriptions: { where: activeSubscriptionWhere() },
          apiTokens: { where: { isActive: true } },
        },
      },
    },
  });

  if (!user) return jsonError("User not found", 404);

  const { _count, ...profile } = user;
  return NextResponse.json({
    ...profile,
    stats: {
      activeSubscriptions: _count.subscriptions,
      activeTokens: _count.apiTokens,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const data = await parseBody(request, updateProfileSchema);
  if (isErrorResponse(data)) return data;

  if (!data.name && data.company === undefined) {
    return jsonError("No fields to update");
  }

  const user = await prisma.user.update({
    where: { id: session.id },
    data: {
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.company !== undefined
        ? { company: data.company?.trim() || null }
        : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
      company: true,
      role: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(user);
}

export async function PUT(request: NextRequest) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const data = await parseBody(request, changePasswordSchema);
  if (isErrorResponse(data)) return data;

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return jsonError("User not found", 404);

  const valid = await verifyPassword(data.currentPassword, user.passwordHash);
  if (!valid) return jsonError("Current password is incorrect", 401);

  await prisma.user.update({
    where: { id: session.id },
    data: { passwordHash: await hashPassword(data.newPassword) },
  });

  return jsonSuccess({ message: "Password updated successfully" });
}
