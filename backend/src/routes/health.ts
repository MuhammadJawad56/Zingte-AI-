import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const [users, apis, activeSubs] = await Promise.all([
      prisma.user.count(),
      prisma.apiProduct.count({ where: { isActive: true } }),
      prisma.subscription.count({
        where: { status: "ACTIVE", expiresAt: { gt: new Date() } },
      }),
    ]);

    return res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
      stats: { users, apis, activeSubscriptions: activeSubs },
    });
  } catch {
    return res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      database: "disconnected",
    });
  }
});

export default router;
