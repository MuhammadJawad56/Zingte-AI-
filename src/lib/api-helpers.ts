import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, type SessionUser } from "@/lib/auth";
import { parseFeatures } from "@/lib/utils";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonSuccess<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export async function requireSession(): Promise<SessionUser | NextResponse> {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  return session;
}

export async function requireAdmin(): Promise<SessionUser | NextResponse> {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (session.role !== "ADMIN") return jsonError("Forbidden", 403);
  return session;
}

export function isErrorResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

export function handleRouteError(error: unknown, fallback = "Request failed") {
  if (error instanceof z.ZodError) {
    return jsonError(error.errors[0]?.message || "Invalid request body");
  }
  console.error(fallback, error);
  return jsonError(fallback, 500);
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

export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<z.infer<T> | NextResponse> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.errors[0]?.message || "Invalid request body");
    }
    return jsonError("Invalid JSON body");
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
