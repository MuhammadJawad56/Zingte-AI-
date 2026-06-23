import { SignJWT, jwtVerify } from "jose";
import type { Request, Response } from "express";
import type { Role } from "@prisma/client";

export const COOKIE_NAME = "zingte_session";
const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-me"
);

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  company: string | null;
}

export async function createSession(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    company: user.company,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(SECRET);
}

export async function verifySession(
  token: string
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as Role,
      company: (payload.company as string) || null,
    };
  } catch {
    return null;
  }
}

export async function getSession(req: Request): Promise<SessionUser | null> {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return null;
  return verifySession(token);
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7 * 1000,
    path: "/",
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}
