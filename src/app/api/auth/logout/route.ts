import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { getAppUrl } from "@/lib/utils";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/login", getAppUrl()));
}
