import { Router } from "express";
import { prisma } from "../lib/prisma";
import { jsonError, requireAdmin } from "../lib/api-helpers";
import { getUsageSummary } from "../lib/rate-limit";
import { getAdminStats } from "../lib/subscription-jobs";

const router = Router();

router.get("/stats", async (req, res) => {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const stats = await getAdminStats();
  return res.json(stats);
});

router.get("/users", async (req, res) => {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const search = req.query.q as string | undefined;
  const role = req.query.role as string | undefined;

  const users = await prisma.user.findMany({
    where: {
      ...(role === "ADMIN" || role === "CUSTOMER" ? { role } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search } },
              { name: { contains: search } },
              { company: { contains: search } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
      company: true,
      role: true,
      emailVerifiedAt: true,
      createdAt: true,
      _count: {
        select: {
          subscriptions: true,
          apiTokens: { where: { isActive: true } },
          usageLogs: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json({
    total: users.length,
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      company: u.company,
      role: u.role,
      emailVerified: !!u.emailVerifiedAt,
      createdAt: u.createdAt,
      subscriptions: u._count.subscriptions,
      activeTokens: u._count.apiTokens,
      totalApiCalls: u._count.usageLogs,
    })),
  });
});

router.get("/users/:id", async (req, res) => {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
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

  if (!user) return jsonError(res, "User not found", 404);

  const usage = await getUsageSummary(req.params.id, 30);

  return res.json({ user, usage });
});

export default router;
