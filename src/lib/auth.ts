import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS } from "./constants";

export {
  COOKIE_NAME,
  createSession,
  verifySession,
  getSession,
  setSessionCookie,
  clearSessionCookie,
  type SessionUser,
} from "./auth-session";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
