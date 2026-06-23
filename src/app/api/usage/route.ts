import { NextResponse } from "next/server";
import {
  isErrorResponse,
  requireSession,
} from "@/lib/api-helpers";
import { getUsageSummary } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const url = new URL(request.url);
  const days = Math.min(
    90,
    Math.max(1, parseInt(url.searchParams.get("days") || "30", 10) || 30)
  );

  const summary = await getUsageSummary(session.id, days);
  return NextResponse.json(summary);
}
