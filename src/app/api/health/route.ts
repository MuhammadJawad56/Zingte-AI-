import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const [users, apis, activeSubs] = await Promise.all([
      prisma.user.count(),
      prisma.apiProduct.count({ where: { isActive: true } }),
      prisma.subscription.count({
        where: { status: "ACTIVE", expiresAt: { gt: new Date() } },
      }),
    ]);

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
      stats: { users, apis, activeSubscriptions: activeSubs },
    });
  } catch {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "disconnected",
      },
      { status: 503 }
    );
  }
}
