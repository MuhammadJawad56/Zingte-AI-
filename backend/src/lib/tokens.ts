import { randomBytes, createHash } from "crypto";

export function generateApiToken(): { token: string; hash: string; prefix: string } {
  const token = `zt_${randomBytes(32).toString("hex")}`;
  const hash = hashToken(token);
  const prefix = token.slice(0, 12) + "...";
  return { token, hash, prefix };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
