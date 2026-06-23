import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateApiToken, hashToken } from "@/lib/tokens";

const createTokenSchema = z.object({
  apiProductId: z.string(),
  name: z.string().min(1).max(50),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tokens = await prisma.apiToken.findMany({
    where: { userId: session.id },
    include: { apiProduct: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    tokens.map((t) => ({
      id: t.id,
      name: t.name,
      tokenPrefix: t.tokenPrefix,
      apiProduct: t.apiProduct,
      lastUsedAt: t.lastUsedAt,
      isActive: t.isActive,
      createdAt: t.createdAt,
    }))
  );
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createTokenSchema.parse(body);

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: session.id,
        apiProductId: data.apiProductId,
        status: "ACTIVE",
        expiresAt: { gt: new Date() },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Active subscription required" },
        { status: 403 }
      );
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
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create token" }, { status: 500 });
  }
}
