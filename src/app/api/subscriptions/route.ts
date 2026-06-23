import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isErrorResponse, requireSession } from "@/lib/api-helpers";

export async function GET() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const where = session.role === "ADMIN" ? {} : { userId: session.id };

  const subscriptions = await prisma.subscription.findMany({
    where,
    include: {
      apiProduct: true,
      user:
        session.role === "ADMIN"
          ? { select: { id: true, name: true, email: true, company: true } }
          : false,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(subscriptions);
}
