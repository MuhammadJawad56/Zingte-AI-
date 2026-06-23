import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createAuthToken, canResendVerification } from "@/lib/auth-tokens";
import { sendVerificationEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = schema.parse(body);
    const normalized = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email: normalized } });

    if (!user) {
      return NextResponse.json({
        message: "If an account exists, a verification email has been sent.",
      });
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json(
        { error: "Email is already verified" },
        { status: 400 }
      );
    }

    const canResend = await canResendVerification(user.id);
    if (!canResend) {
      return NextResponse.json(
        { error: "Please wait a minute before requesting another email" },
        { status: 429 }
      );
    }

    const token = await createAuthToken(user.id, "EMAIL_VERIFICATION");
    await sendVerificationEmail(user.email, user.name, token);

    return NextResponse.json({
      message: "Verification email sent. Please check your inbox.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
