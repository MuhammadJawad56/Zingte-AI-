import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateApiToken } from "@/lib/tokens";
import { activeSubscriptionWhere } from "@/lib/subscriptions";
import {
  handleRouteError,
  isErrorResponse,
  jsonError,
  parseBody,
  requireSession,
  serializeApiToken,
} from "@/lib/api-helpers";
import { createTokenSchema } from "@/lib/validators";

export async function GET() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const tokens = await prisma.apiToken.findMany({
    where: { userId: session.id },
    include: { apiProduct: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tokens.map(serializeApiToken));
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const data = await parseBody(request, createTokenSchema);
  if (isErrorResponse(data)) return data;

  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: session.id,
        apiProductId: data.apiProductId,
        ...activeSubscriptionWhere(),
      },
    });

    if (!subscription) {
      return jsonError("Active subscription required", 403);
    }

    const { token, hash, prefix } = generateApiToken();

    await prisma.apiToken.create({
      data: {
        userId: session.id,
        apiProductId: data.apiProductId,
        name: data.name,
        tokenHash: hash,
        tokenPrefix: prefix,
      },
    });

    return NextResponse.json({ token }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Failed to create token");
  }
}
