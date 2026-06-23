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

export async function requireCustomer(): Promise<SessionUser | NextResponse> {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (session.role !== "CUSTOMER" && session.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }
  return session;
}

export function isErrorResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
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
