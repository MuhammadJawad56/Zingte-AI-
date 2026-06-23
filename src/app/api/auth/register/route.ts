import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuthToken } from "@/lib/auth-tokens";
import { hashPassword } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import {
  handleRouteError,
  isErrorResponse,
  jsonError,
  parseBody,
} from "@/lib/api-helpers";
import { registerSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const data = await parseBody(request, registerSchema);
  if (isErrorResponse(data)) return data;

  try {
    const email = data.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (!existing.emailVerifiedAt) {
        return NextResponse.json(
          {
            error: "Email already registered but not verified",
            code: "EMAIL_NOT_VERIFIED",
            email,
          },
          { status: 409 }
        );
      }
      return jsonError("Email already registered");
    }

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: data.name.trim(),
        company: data.company?.trim() || null,
        role: "CUSTOMER",
      },
    });

    const token = await createAuthToken(user.id, "EMAIL_VERIFICATION");
    await sendVerificationEmail(user.email, user.name, token);

    return NextResponse.json(
      {
        message: "Account created. Please check your email to verify your account.",
        email: user.email,
        requiresVerification: true,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, "Registration failed");
  }
}
