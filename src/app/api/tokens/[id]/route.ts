import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isErrorResponse,
  jsonError,
  parseBody,
  requireSession,
  serializeApiToken,
} from "@/lib/api-helpers";
import { createTokenSchema } from "@/lib/validators";

const renameTokenSchema = createTokenSchema.pick({ name: true });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const data = await parseBody(request, renameTokenSchema);
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

  return NextResponse.json(serializeApiToken(updated));
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
