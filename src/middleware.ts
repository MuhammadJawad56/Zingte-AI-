import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/auth-session";

const publicPaths = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];
const adminPaths = ["/admin"];

function isApiRoute(pathname: string) {
  return pathname.startsWith("/api/");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = isApiRoute(pathname);

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
    if (isApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const needsCustomerRole =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/api/subscriptions") ||
    pathname.startsWith("/api/tokens") ||
    pathname.startsWith("/api/catalog") ||
    pathname.startsWith("/api/usage") ||
    pathname.startsWith("/api/user");

  if (
    needsCustomerRole &&
    session?.role !== "CUSTOMER" &&
    session?.role !== "ADMIN"
  ) {
    if (isApi) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (adminPaths.some((p) => pathname.startsWith(p)) && session?.role !== "ADMIN") {
    if (isApi) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/api/admin") && session?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if ((pathname === "/login" || pathname === "/register") && session) {
    const dest = session.role === "ADMIN" ? "/admin" : "/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
