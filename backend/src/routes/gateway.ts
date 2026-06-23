import { Router, type Request, type Response } from "express";
import {
  ApiAuthError,
  authenticateApiToken,
  extractBearerToken,
  logApiUsage,
} from "../lib/api-token-auth";
import { prisma } from "../lib/prisma";

const router = Router({ mergeParams: true });

function parseGatewayPath(req: Request): { slug: string; pathSegments: string[] } {
  const segments = req.path.replace(/^\//, "").split("/").filter(Boolean);
  const slug = segments[0] || "";
  const pathSegments = segments.slice(1);
  return { slug, pathSegments };
}

async function handleGateway(req: Request, res: Response) {
  const { slug, pathSegments } = parseGatewayPath(req);

  if (!slug) {
    return res.status(404).json({ error: "API not found" });
  }

  const start = Date.now();
  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)
      ?.split(",")[0]
      ?.trim() || null;
  const method = req.method;
  const path = pathSegments.length ? pathSegments.join("/") : "";
  const endpoint = `/api/gateway/${slug}${path ? `/${path}` : ""}`;

  let context;
  try {
    const token = extractBearerToken(
      req.headers.authorization as string | undefined
    );
    context = await authenticateApiToken(token, { apiSlug: slug });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code,
      });
    }
    return res.status(401).json({ error: "Authentication failed" });
  }

  const { apiToken } = context;
  const api = apiToken.apiProduct;

  const search = req.url.includes("?")
    ? req.url.slice(req.url.indexOf("?"))
    : "";
  const targetUrl = `${api.baseUrl.replace(/\/$/, "")}/${path}${search}`;

  const forwardHeaders = new Headers();
  const contentType = req.headers["content-type"];
  if (contentType) forwardHeaders.set("content-type", contentType as string);
  const authHeader = req.headers.authorization as string;
  forwardHeaders.set("Authorization", `Bearer ${authHeader.slice(7)}`);
  forwardHeaders.set("X-Zingte-User-Id", apiToken.userId);
  forwardHeaders.set("X-Zingte-Api-Slug", api.slug);

  let body: Uint8Array | undefined;
  if (method !== "GET" && method !== "HEAD" && Buffer.isBuffer(req.body)) {
    body = new Uint8Array(req.body);
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
    return res.status(502).json({
      error: "Upstream API unreachable",
      targetUrl,
    });
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

  if (responseHeaders) {
    for (const [key, value] of responseHeaders.entries()) {
      res.setHeader(key, value);
    }
  }
  return res.status(statusCode).send(Buffer.from(responseBody!));
}

async function handleOptions(req: Request, res: Response) {
  const { slug } = parseGatewayPath(req);
  const api = await prisma.apiProduct.findUnique({ where: { slug } });
  if (!api) {
    return res.status(404).json({ error: "API not found" });
  }
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type"
  );
  return res.status(204).send();
}

router.options("*", handleOptions);
router.all("*", handleGateway);

export default router;
