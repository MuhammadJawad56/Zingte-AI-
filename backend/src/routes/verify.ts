import { Router } from "express";
import {
  ApiAuthError,
  authenticateApiToken,
  extractBearerToken,
  logApiUsage,
} from "../lib/api-token-auth";
import { checkRateLimit } from "../lib/rate-limit";

const router = Router();

router.post("/", async (req, res) => {
  const start = Date.now();
  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)
      ?.split(",")[0]
      ?.trim() || null;

  try {
    const rawToken = extractBearerToken(
      req.headers.authorization as string | undefined
    );
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

    return res.json({
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
      return res.status(error.status).json({
        error: error.message,
        code: error.code,
        valid: false,
      });
    }
    return res.status(500).json({ error: "Verification failed" });
  }
});

export default router;
