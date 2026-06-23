import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import {
  handleRouteError,
  isErrorResponse,
  jsonError,
  parseBody,
} from "@/lib/api-helpers";
import { loginSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const data = await parseBody(request, loginSchema);
  if (isErrorResponse(data)) return data;

  try {
    const email = data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await verifyPassword(data.password, user.passwordHash))) {
      return jsonError("Invalid email or password", 401);
    }

    if (!user.emailVerifiedAt) {
      return NextResponse.json(
        {
          error: "Please verify your email before signing in",
          code: "EMAIL_NOT_VERIFIED",
          email: user.email,
        },
        { status: 403 }
      );
    }

    const token = await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      company: user.company,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: true,
      },
    });
  } catch (error) {
    return handleRouteError(error, "Login failed");
  }
}
