import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword } from "../lib/auth";
import { activeSubscriptionWhere } from "../lib/subscriptions";
import {
  jsonError,
  jsonSuccess,
  parseBody,
  requireSession,
} from "../lib/api-helpers";
import { changePasswordSchema } from "../lib/validators";

const router = Router();

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  company: z.string().nullable().optional(),
});

router.get("/", async (req, res) => {
  const session = await requireSession(req, res);
  if (!session) return;

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

  if (!user) return jsonError(res, "User not found", 404);

  const { _count, ...profile } = user;
  return res.json({
    ...profile,
    stats: {
      activeSubscriptions: _count.subscriptions,
      activeTokens: _count.apiTokens,
    },
  });
});

router.patch("/", async (req, res) => {
  const session = await requireSession(req, res);
  if (!session) return;

  const data = parseBody(req, res, updateProfileSchema);
  if (!data) return;

  if (!data.name && data.company === undefined) {
    return jsonError(res, "No fields to update");
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

  return res.json(user);
});

router.put("/", async (req, res) => {
  const session = await requireSession(req, res);
  if (!session) return;

  const data = parseBody(req, res, changePasswordSchema);
  if (!data) return;

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return jsonError(res, "User not found", 404);

  const valid = await verifyPassword(data.currentPassword, user.passwordHash);
  if (!valid) return jsonError(res, "Current password is incorrect", 401);

  await prisma.user.update({
    where: { id: session.id },
    data: { passwordHash: await hashPassword(data.newPassword) },
  });

  return jsonSuccess(res, { message: "Password updated successfully" });
});

export default router;
