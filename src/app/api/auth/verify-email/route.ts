import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, setSessionCookie } from "@/lib/auth";
import { consumeAuthToken } from "@/lib/auth-tokens";
import { sendWelcomeEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const appUrl = getAppUrl();

  if (!token) {
    return NextResponse.redirect(`${appUrl}/verify-email?error=missing_token`);
  }

  const result = await consumeAuthToken(token, "EMAIL_VERIFICATION");
  if (!result) {
    return NextResponse.redirect(`${appUrl}/verify-email?error=invalid_token`);
  }

  const user = await prisma.user.update({
    where: { id: result.userId },
    data: { emailVerifiedAt: new Date() },
  });

  const sessionToken = await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    company: user.company,
  });
  await setSessionCookie(sessionToken);

  sendWelcomeEmail(user.email, user.name).catch(console.error);

  const dest = user.role === "ADMIN" ? "/admin" : "/dashboard";
  return NextResponse.redirect(`${appUrl}${dest}?verified=1`);
}
