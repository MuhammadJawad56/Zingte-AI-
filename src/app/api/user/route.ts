import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  isErrorResponse,
  jsonError,
  jsonSuccess,
  parseBody,
  requireSession,
} from "@/lib/api-helpers";

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
          subscriptions: { where: { status: "ACTIVE" } },
          apiTokens: { where: { isActive: true } },
        },
      },
    },
  });

  if (!user) return jsonError("User not found", 404);

  return NextResponse.json({
    ...user,
    stats: {
      activeSubscriptions: user._count.subscriptions,
      activeTokens: user._count.apiTokens,
    },
    _count: undefined,
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

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/, "Must include uppercase letter")
    .regex(/[0-9]/, "Must include a number"),
});

export async function PUT(request: NextRequest) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const data = await parseBody(request, changePasswordSchema);
  if (isErrorResponse(data)) return data;

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return jsonError("User not found", 404);

  const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
  if (!valid) return jsonError("Current password is incorrect", 401);

  const passwordHash = await bcrypt.hash(data.newPassword, 12);
  await prisma.user.update({
    where: { id: session.id },
    data: { passwordHash },
  });

  return jsonSuccess({ message: "Password updated successfully" });
}
