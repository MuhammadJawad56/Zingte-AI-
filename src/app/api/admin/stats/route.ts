import { NextResponse } from "next/server";
import { isErrorResponse, requireAdmin } from "@/lib/api-helpers";
import { getAdminStats } from "@/lib/subscription-jobs";

export async function GET() {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const stats = await getAdminStats();
  return NextResponse.json(stats);
}
