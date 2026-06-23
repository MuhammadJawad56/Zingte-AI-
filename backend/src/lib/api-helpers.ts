import type { Request, Response } from "express";
import { z } from "zod";
import { getSession, type SessionUser } from "./auth";
import { parseFeatures } from "./utils";

export function jsonError(res: Response, message: string, status = 400) {
  return res.status(status).json({ error: message });
}

export function jsonSuccess<T extends Record<string, unknown>>(
  res: Response,
  data: T,
  status = 200
) {
  return res.status(status).json(data);
}

export async function requireSession(
  req: Request,
  res: Response
): Promise<SessionUser | null> {
  const session = await getSession(req);
  if (!session) {
    jsonError(res, "Unauthorized", 401);
    return null;
  }
  return session;
}

export async function requireAdmin(
  req: Request,
  res: Response
): Promise<SessionUser | null> {
  const session = await getSession(req);
  if (!session) {
    jsonError(res, "Unauthorized", 401);
    return null;
  }
  if (session.role !== "ADMIN") {
    jsonError(res, "Forbidden", 403);
    return null;
  }
  return session;
}

export function handleRouteError(
  res: Response,
  error: unknown,
  fallback = "Request failed"
) {
  if (error instanceof z.ZodError) {
    return jsonError(res, error.errors[0]?.message || "Invalid request body");
  }
  console.error(fallback, error);
  return jsonError(res, fallback, 500);
}

export function serializeApiToken(token: {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  apiProduct: { name: string; slug: string };
}) {
  return {
    id: token.id,
    name: token.name,
    tokenPrefix: token.tokenPrefix,
    apiProduct: token.apiProduct,
    lastUsedAt: token.lastUsedAt,
    isActive: token.isActive,
    createdAt: token.createdAt,
  };
}

export function parseBody<T extends z.ZodType>(
  req: Request,
  res: Response,
  schema: T
): z.infer<T> | null {
  try {
    return schema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      jsonError(res, error.errors[0]?.message || "Invalid request body");
      return null;
    }
    jsonError(res, "Invalid JSON body");
    return null;
  }
}

export function serializeApiProduct(api: {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  baseUrl: string;
  version: string;
  priceMonthly: number;
  priceYearly: number;
  rateLimit: number;
  features: string;
  documentation: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: api.id,
    name: api.name,
    slug: api.slug,
    description: api.description,
    category: api.category,
    baseUrl: api.baseUrl,
    version: api.version,
    priceMonthly: api.priceMonthly,
    priceYearly: api.priceYearly,
    rateLimit: api.rateLimit,
    features: parseFeatures(api.features),
    documentation: api.documentation,
    isActive: api.isActive,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}
