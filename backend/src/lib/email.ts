import nodemailer from "nodemailer";
import type Transporter from "nodemailer/lib/mailer";
import { getBackendUrl, getFrontendUrl } from "./utils";

export type EmailSendResult = {
  sent: boolean;
  dev: boolean;
  actionUrl?: string;
};

function getFromAddress() {
  const name = process.env.EMAIL_FROM_NAME || "Zingte API Hub";
  const email =
    process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@zingte.ai";
  return `"${name}" <${email}>`;
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim()
  );
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!isSmtpConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

function extractActionUrl(html: string): string | undefined {
  const match = html.match(/href="([^"]+)"/);
  return match?.[1];
}

function emailLayout(
  title: string,
  body: string,
  ctaLabel: string,
  ctaUrl: string
) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:Inter,Segoe UI,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#12121a;border:1px solid #27272f;border-radius:12px;padding:32px;">
        <tr><td>
          <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#818cf8;text-transform:uppercase;letter-spacing:1px;">Zingte API Hub</p>
          <h1 style="margin:0 0 16px;font-size:22px;color:#f4f4f5;">${title}</h1>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#a1a1aa;">${body}</p>
          <a href="${ctaUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">${ctaLabel}</a>
          <p style="margin:24px 0 0;font-size:12px;color:#71717a;line-height:1.5;">If the button doesn't work, copy this link:<br><a href="${ctaUrl}" style="color:#818cf8;word-break:break-all;">${ctaUrl}</a></p>
          <p style="margin:16px 0 0;font-size:11px;color:#52525b;">If you didn't request this, you can safely ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<EmailSendResult> {
  const actionUrl = extractActionUrl(html);
  const transport = getTransporter();

  if (!transport) {
    console.log("\n========== EMAIL (SMTP not configured) ==========");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    if (actionUrl) console.log(`Link: ${actionUrl}`);
    console.log("=================================================\n");
    return { sent: false, dev: true, actionUrl };
  }

  await transport.sendMail({
    from: getFromAddress(),
    to,
    subject,
    html,
  });

  return { sent: true, dev: false, actionUrl };
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<EmailSendResult> {
  const url = `${getBackendUrl()}/api/auth/verify-email?token=${token}`;
  const html = emailLayout(
    "Verify your email",
    `Hi ${name},<br><br>Thanks for signing up for Zingte API Hub. Please verify your email address to activate your account and start subscribing to APIs. This link expires in 24 hours.`,
    "Verify email address",
    url
  );
  return sendEmail(email, "Verify your Zingte API Hub account", html);
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string
): Promise<EmailSendResult> {
  const url = `${getFrontendUrl()}/reset-password?token=${token}`;
  const html = emailLayout(
    "Reset your password",
    `Hi ${name},<br><br>We received a request to reset your password. This link expires in 1 hour.`,
    "Reset password",
    url
  );
  return sendEmail(email, "Reset your Zingte API Hub password", html);
}

export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<EmailSendResult> {
  const url = `${getFrontendUrl()}/dashboard`;
  const html = emailLayout(
    "Welcome to Zingte API Hub",
    `Hi ${name},<br><br>Your email is verified and your account is active. Browse our API catalog, subscribe, and generate access tokens.`,
    "Go to dashboard",
    url
  );
  return sendEmail(email, "Welcome to Zingte API Hub", html);
}

export async function verifySmtpConnection(): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) return false;
  await transport.verify();
  return true;
}
