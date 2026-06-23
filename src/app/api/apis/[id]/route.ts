import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  handleRouteError,
  isErrorResponse,
  jsonError,
  parseBody,
  requireAdmin,
  serializeApiProduct,
} from "@/lib/api-helpers";
import { updateApiProductSchema } from "@/lib/validators";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const api = await prisma.apiProduct.findUnique({
    where: { id },
    include: {
      _count: { select: { subscriptions: true, apiTokens: true, usageLogs: true } },
    },
  });

  if (!api) return jsonError("Not found", 404);

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
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const data = await parseBody(request, updateApiProductSchema);
  if (isErrorResponse(data)) return data;

  try {
    const updateData: Record<string, unknown> = { ...data };
    if (data.features) {
      updateData.features = JSON.stringify(data.features);
    }

    const api = await prisma.apiProduct.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(serializeApiProduct(api));
  } catch (error) {
    return handleRouteError(error, "Failed to update API");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  await prisma.apiProduct.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
