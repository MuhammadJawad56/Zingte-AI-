import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  isErrorResponse,
  jsonError,
  parseBody,
  requireSession,
} from "@/lib/api-helpers";

const updateTokenSchema = z.object({
  name: z.string().min(1).max(50),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const data = await parseBody(request, updateTokenSchema);
  if (isErrorResponse(data)) return data;

  const token = await prisma.apiToken.findUnique({ where: { id } });
  if (!token || token.userId !== session.id) {
    return jsonError("Not found", 404);
  }

  const updated = await prisma.apiToken.update({
    where: { id },
    data: { name: data.name.trim() },
    include: { apiProduct: { select: { name: true, slug: true } } },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    tokenPrefix: updated.tokenPrefix,
    isActive: updated.isActive,
    apiProduct: updated.apiProduct,
    lastUsedAt: updated.lastUsedAt,
    createdAt: updated.createdAt,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const token = await prisma.apiToken.findUnique({ where: { id } });

  if (!token || token.userId !== session.id) {
    return jsonError("Not found", 404);
  }

  await prisma.apiToken.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
