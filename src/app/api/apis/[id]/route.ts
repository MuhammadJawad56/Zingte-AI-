import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { serializeApiProduct } from "@/lib/api-helpers";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(10).optional(),
  category: z.string().min(2).optional(),
  baseUrl: z.string().url().optional(),
  version: z.string().optional(),
  priceMonthly: z.number().positive().optional(),
  priceYearly: z.number().positive().optional(),
  rateLimit: z.number().int().positive().optional(),
  features: z.array(z.string()).optional(),
  documentation: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const api = await prisma.apiProduct.findUnique({
    where: { id },
    include: {
      _count: { select: { subscriptions: true, apiTokens: true, usageLogs: true } },
    },
  });

  if (!api) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...serializeApiProduct(api),
    stats: {
      subscriptions: api._count.subscriptions,
      tokens: api._count.apiTokens,
      totalCalls: api._count.usageLogs,
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const updateData: Record<string, unknown> = { ...data };
    if (data.features) {
      updateData.features = JSON.stringify(data.features);
    }

    const api = await prisma.apiProduct.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(api);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update API" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.apiProduct.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
