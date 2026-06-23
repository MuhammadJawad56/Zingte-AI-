import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuthToken, canResendVerification } from "@/lib/auth-tokens";
import { sendVerificationEmail } from "@/lib/email";
import {
  handleRouteError,
  isErrorResponse,
  jsonError,
  parseBody,
} from "@/lib/api-helpers";
import { z } from "zod";

const resendSchema = z.object({
  email: z.string().email(),
});

function devOnlyPayload(actionUrl?: string) {
  if (process.env.NODE_ENV !== "development" || !actionUrl) return {};
  return { devVerificationUrl: actionUrl };
}

export async function POST(request: NextRequest) {
  const data = await parseBody(request, resendSchema);
  if (isErrorResponse(data)) return data;

  try {
    const normalized = data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalized } });

    if (!user) {
      return NextResponse.json({
        message: "If an account exists, a verification email has been sent.",
      });
    }

    if (user.emailVerifiedAt) {
      return jsonError("Email is already verified");
    }

    const canResend = await canResendVerification(user.id);
    if (!canResend) {
      return jsonError("Please wait a minute before requesting another email", 429);
    }

    const token = await createAuthToken(user.id, "EMAIL_VERIFICATION");

    let emailResult;
    try {
      emailResult = await sendVerificationEmail(user.email, user.name, token);
    } catch (emailError) {
      console.error("Resend verification email failed:", emailError);
      return jsonError("Failed to send email. Check SMTP settings.", 500);
    }

    return NextResponse.json({
      message: "Verification email sent. Please check your inbox.",
      emailSent: emailResult.sent,
      emailMode: emailResult.dev ? "dev" : "smtp",
      ...devOnlyPayload(emailResult.actionUrl),
    });
  } catch (error) {
    return handleRouteError(error, "Failed to send email");
  }
}
