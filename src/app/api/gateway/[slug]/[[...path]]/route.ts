import { NextRequest, NextResponse } from "next/server";
import {
  ApiAuthError,
  authenticateApiToken,
  extractBearerToken,
  logApiUsage,
} from "@/lib/api-token-auth";
import { prisma } from "@/lib/prisma";

async function handleGateway(
  request: NextRequest,
  slug: string,
  pathSegments: string[] | undefined
) {
  const start = Date.now();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const method = request.method;
  const path = pathSegments?.length ? pathSegments.join("/") : "";
  const endpoint = `/api/gateway/${slug}${path ? `/${path}` : ""}`;

  let context;
  try {
    const token = extractBearerToken(request.headers.get("authorization"));
    context = await authenticateApiToken(token, { apiSlug: slug });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }

  const { apiToken } = context;
  const api = apiToken.apiProduct;

  const search = request.nextUrl.search;
  const targetUrl = `${api.baseUrl.replace(/\/$/, "")}/${path}${search}`;

  const forwardHeaders = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) forwardHeaders.set("content-type", contentType);
  forwardHeaders.set("Authorization", `Bearer ${request.headers.get("authorization")!.slice(7)}`);
  forwardHeaders.set("X-Zingte-User-Id", apiToken.userId);
  forwardHeaders.set("X-Zingte-Api-Slug", api.slug);

  let body: BodyInit | undefined;
  if (method !== "GET" && method !== "HEAD") {
    body = await request.arrayBuffer();
  }

  let statusCode = 502;
  let responseBody: ArrayBuffer | null = null;
  let responseHeaders: Headers | null = null;

  try {
    const upstream = await fetch(targetUrl, {
      method,
      headers: forwardHeaders,
      body,
    });

    statusCode = upstream.status;
    responseBody = await upstream.arrayBuffer();
    responseHeaders = new Headers();
    const passHeaders = ["content-type", "cache-control", "x-request-id"];
    for (const h of passHeaders) {
      const v = upstream.headers.get(h);
      if (v) responseHeaders.set(h, v);
    }
  } catch {
    statusCode = 502;
    await logApiUsage({
      userId: apiToken.userId,
      apiProductId: api.id,
      apiTokenId: apiToken.id,
      endpoint,
      method,
      statusCode,
      latencyMs: Date.now() - start,
      ipAddress: ip,
    });
    return NextResponse.json(
      { error: "Upstream API unreachable", targetUrl },
      { status: 502 }
    );
  }

  await logApiUsage({
    userId: apiToken.userId,
    apiProductId: api.id,
    apiTokenId: apiToken.id,
    endpoint,
    method,
    statusCode,
    latencyMs: Date.now() - start,
    ipAddress: ip,
  });

  return new NextResponse(responseBody, {
    status: statusCode,
    headers: responseHeaders || undefined,
  });
}

type RouteParams = { params: Promise<{ slug: string; path?: string[] }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug, path } = await params;
  return handleGateway(request, slug, path);
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { slug, path } = await params;
  return handleGateway(request, slug, path);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { slug, path } = await params;
  return handleGateway(request, slug, path);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { slug, path } = await params;
  return handleGateway(request, slug, path);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { slug, path } = await params;
  return handleGateway(request, slug, path);
}

export async function OPTIONS(
  _request: NextRequest,
  { params }: RouteParams
) {
  const { slug } = await params;
  const api = await prisma.apiProduct.findUnique({ where: { slug } });
  if (!api) {
    return NextResponse.json({ error: "API not found" }, { status: 404 });
  }
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
}
