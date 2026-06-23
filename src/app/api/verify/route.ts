import { NextRequest, NextResponse } from "next/server";
import {
  ApiAuthError,
  authenticateApiToken,
  extractBearerToken,
  logApiUsage,
} from "@/lib/api-token-auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const start = Date.now();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

  try {
    const rawToken = extractBearerToken(request.headers.get("authorization"));
    const { apiToken } = await authenticateApiToken(rawToken);

    const rateLimit = await checkRateLimit(
      apiToken.id,
      apiToken.apiProductId,
      apiToken.apiProduct.rateLimit
    );

    await logApiUsage({
      userId: apiToken.userId,
      apiProductId: apiToken.apiProductId,
      apiTokenId: apiToken.id,
      endpoint: "/api/verify",
      method: "POST",
      statusCode: 200,
      latencyMs: Date.now() - start,
      ipAddress: ip,
    });

    return NextResponse.json({
      valid: true,
      api: {
        id: apiToken.apiProduct.id,
        name: apiToken.apiProduct.name,
        slug: apiToken.apiProduct.slug,
        baseUrl: apiToken.apiProduct.baseUrl,
        version: apiToken.apiProduct.version,
        rateLimit: apiToken.apiProduct.rateLimit,
        gatewayUrl: `/api/gateway/${apiToken.apiProduct.slug}`,
      },
      user: apiToken.user,
      rateLimit: {
        used: rateLimit.used + 1,
        limit: rateLimit.limit,
        resetsAt: rateLimit.resetsAt,
      },
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code, valid: false },
        { status: error.status }
      );
    }
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
