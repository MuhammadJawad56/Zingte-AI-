import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isErrorResponse, requireAdmin } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const search = request.nextUrl.searchParams.get("q");
  const role = request.nextUrl.searchParams.get("role");

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

  return NextResponse.json({
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
}
