import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/auth";

const publicPaths = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];
const adminPaths = ["/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    publicPaths.some((p) => pathname === p) ||
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/verify" ||
    pathname === "/api/health" ||
    pathname.startsWith("/api/gateway") ||
    pathname === "/api/stripe/webhook";

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  if (!isPublic && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (
    (pathname.startsWith("/dashboard") || pathname.startsWith("/api/subscriptions") || pathname.startsWith("/api/tokens")) &&
    session?.role !== "CUSTOMER" &&
    session?.role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (adminPaths.some((p) => pathname.startsWith(p)) && session?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/api/admin") && session?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (
    (pathname === "/login" || pathname === "/register") && session
  ) {
    const dest = session.role === "ADMIN" ? "/admin" : "/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
