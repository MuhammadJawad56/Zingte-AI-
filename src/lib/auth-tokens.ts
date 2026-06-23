import { createHash, randomBytes } from "crypto";
import type { AuthTokenType } from "@prisma/client";
import { prisma } from "./prisma";

const EMAIL_VERIFY_HOURS = 24;
const PASSWORD_RESET_HOURS = 1;
const RESEND_COOLDOWN_MS = 60_000;

export function generateAuthToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("hex");
  const hash = hashAuthToken(token);
  return { token, hash };
}

export function hashAuthToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function expiresInHours(hours: number): Date {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d;
}

export async function createAuthToken(
  userId: string,
  type: AuthTokenType
): Promise<string> {
  await prisma.authToken.deleteMany({ where: { userId, type } });

  const { token, hash } = generateAuthToken();
  const hours =
    type === "EMAIL_VERIFICATION" ? EMAIL_VERIFY_HOURS : PASSWORD_RESET_HOURS;

  await prisma.authToken.create({
    data: {
      userId,
      tokenHash: hash,
      type,
      expiresAt: expiresInHours(hours),
    },
  });

  return token;
}

export async function consumeAuthToken(
  rawToken: string,
  type: AuthTokenType
): Promise<{ userId: string } | null> {
  const hash = hashAuthToken(rawToken);
  const record = await prisma.authToken.findUnique({
    where: { tokenHash: hash },
  });

  if (!record || record.type !== type || record.expiresAt < new Date()) {
    return null;
  }

  await prisma.authToken.delete({ where: { id: record.id } });
  return { userId: record.userId };
}

export async function canResendVerification(userId: string): Promise<boolean> {
  const recent = await prisma.authToken.findFirst({
    where: { userId, type: "EMAIL_VERIFICATION" },
    orderBy: { createdAt: "desc" },
  });
  if (!recent) return true;
  return Date.now() - recent.createdAt.getTime() >= RESEND_COOLDOWN_MS;
}
