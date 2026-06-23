import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { createAuthToken, canResendVerification, consumeAuthToken, hashAuthToken } from "../lib/auth-tokens";
import { createSession, setSessionCookie, clearSessionCookie } from "../lib/auth-session";
import { hashPassword, verifyPassword } from "../lib/auth";
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from "../lib/email";
import {
  handleRouteError,
  jsonError,
  parseBody,
} from "../lib/api-helpers";
import { registerSchema, loginSchema, resetPasswordSchema } from "../lib/validators";
import { getAppUrl } from "../lib/utils";

const router = Router();

function devOnlyPayload(actionUrl?: string) {
  if (process.env.NODE_ENV !== "development" || !actionUrl) return {};
  return { devVerificationUrl: actionUrl };
}

const resendSchema = z.object({
  email: z.string().email(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

router.post("/register", async (req, res) => {
  try {
  const data = parseBody(req, res, registerSchema);
  if (!data) return;

    const email = data.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (!existing.emailVerifiedAt) {
        return res.status(409).json({
          error: "Email already registered but not verified",
          code: "EMAIL_NOT_VERIFIED",
          email,
        });
      }
      return jsonError(res, "Email already registered");
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

    let emailResult;
    try {
      emailResult = await sendVerificationEmail(user.email, user.name, token);
    } catch (emailError) {
      console.error("Verification email failed:", emailError);
      return res.status(201).json({
        message:
          "Account created, but we could not send the verification email. Use 'Resend' on the next screen.",
        email: user.email,
        requiresVerification: true,
        emailSent: false,
      });
    }

    return res.status(201).json({
      message:
        "Account created. Please check your email to verify your account.",
      email: user.email,
      requiresVerification: true,
      emailSent: emailResult.sent,
      emailMode: emailResult.dev ? "dev" : "smtp",
      ...devOnlyPayload(emailResult.actionUrl),
    });
  } catch (error) {
    return handleRouteError(res, error, "Registration failed");
  }
});

router.post("/login", async (req, res) => {
  try {
  const data = parseBody(req, res, loginSchema);
  if (!data) return;

    const email = data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await verifyPassword(data.password, user.passwordHash))) {
      return jsonError(res, "Invalid email or password", 401);
    }

    if (!user.emailVerifiedAt) {
      return res.status(403).json({
        error: "Please verify your email before signing in",
        code: "EMAIL_NOT_VERIFIED",
        email: user.email,
      });
    }

    const token = await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      company: user.company,
    });
    setSessionCookie(res, token);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: true,
      },
    });
  } catch (error) {
    return handleRouteError(res, error, "Login failed");
  }
});

router.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  return res.redirect(`${getAppUrl()}/login`);
});

router.get("/verify-email", async (req, res) => {
  const token = req.query.token as string | undefined;
  const appUrl = getAppUrl();

  if (!token) {
    return res.redirect(`${appUrl}/verify-email?error=missing_token`);
  }

  const hash = hashAuthToken(token);
  const record = await prisma.authToken.findUnique({
    where: { tokenHash: hash },
    include: { user: true },
  });

  if (!record || record.type !== "EMAIL_VERIFICATION") {
    return res.redirect(`${appUrl}/verify-email?error=used_or_invalid`);
  }

  if (record.expiresAt < new Date()) {
    return res.redirect(`${appUrl}/verify-email?error=expired_token`);
  }

  if (record.user.emailVerifiedAt) {
    await prisma.authToken.delete({ where: { id: record.id } });
    return res.redirect(`${appUrl}/login?verified=already`);
  }

  const result = await consumeAuthToken(token, "EMAIL_VERIFICATION");
  if (!result) {
    return res.redirect(`${appUrl}/verify-email?error=used_or_invalid`);
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
  setSessionCookie(res, sessionToken);

  sendWelcomeEmail(user.email, user.name).catch(console.error);

  const dest = user.role === "ADMIN" ? "/admin" : "/dashboard";
  return res.redirect(`${appUrl}${dest}?verified=1`);
});

router.post("/resend-verification", async (req, res) => {
  try {
  const data = parseBody(req, res, resendSchema);
  if (!data) return;

    const normalized = data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalized } });

    if (!user) {
      return res.json({
        message: "If an account exists, a verification email has been sent.",
      });
    }

    if (user.emailVerifiedAt) {
      return jsonError(res, "Email is already verified");
    }

    const canResend = await canResendVerification(user.id);
    if (!canResend) {
      return jsonError(res, "Please wait a minute before requesting another email", 429);
    }

    const token = await createAuthToken(user.id, "EMAIL_VERIFICATION");

    let emailResult;
    try {
      emailResult = await sendVerificationEmail(user.email, user.name, token);
    } catch (emailError) {
      console.error("Resend verification email failed:", emailError);
      return jsonError(res, "Failed to send email. Check SMTP settings.", 500);
    }

    return res.json({
      message: "Verification email sent. Please check your inbox.",
      emailSent: emailResult.sent,
      emailMode: emailResult.dev ? "dev" : "smtp",
      ...devOnlyPayload(emailResult.actionUrl),
    });
  } catch (error) {
    return handleRouteError(res, error, "Failed to send email");
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const data = forgotPasswordSchema.parse(req.body);
    const normalized = data.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email: normalized } });

    if (user) {
      const token = await createAuthToken(user.id, "PASSWORD_RESET");
      await sendPasswordResetEmail(user.email, user.name, token);
    }

    return res.json({
      message: "If an account exists with that email, a reset link has been sent.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(res, error.errors[0].message);
    }
    return jsonError(res, "Request failed", 500);
  }
});

router.post("/reset-password", async (req, res) => {
  try {
  const data = parseBody(req, res, resetPasswordSchema);
  if (!data) return;

    const result = await consumeAuthToken(data.token, "PASSWORD_RESET");
    if (!result) {
      return jsonError(res, "Invalid or expired reset link");
    }

    const passwordHash = await hashPassword(data.password);
    await prisma.user.update({
      where: { id: result.userId },
      data: { passwordHash },
    });

    return res.json({ message: "Password updated successfully" });
  } catch (error) {
    return handleRouteError(res, error, "Reset failed");
  }
});

export default router;
