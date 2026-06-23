import type { ApiProduct, ApiToken, Subscription, User } from "@prisma/client";
import { prisma } from "./prisma";
import { hashToken } from "./tokens";
import { checkRateLimit } from "./rate-limit";
import { activeSubscriptionWhere } from "./subscriptions";

export class ApiAuthError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "ApiAuthError";
  }
}

export type AuthenticatedApiContext = {
  apiToken: ApiToken & { apiProduct: ApiProduct; user: Pick<User, "id" | "email" | "company"> };
  subscription: Subscription;
};

export function extractBearerToken(authHeader: string | null | undefined): string {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new ApiAuthError("Missing API token", 401, "MISSING_TOKEN");
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    throw new ApiAuthError("Missing API token", 401, "MISSING_TOKEN");
  }
  return token;
}

export async function authenticateApiToken(
  rawToken: string,
  options?: { apiSlug?: string }
): Promise<AuthenticatedApiContext> {
  const tokenHash = hashToken(rawToken);

  const apiToken = await prisma.apiToken.findUnique({
    where: { tokenHash },
    include: {
      apiProduct: true,
      user: { select: { id: true, email: true, company: true } },
    },
  });

  if (!apiToken || !apiToken.isActive) {
    throw new ApiAuthError("Invalid API token", 401, "INVALID_TOKEN");
  }

  if (apiToken.expiresAt && apiToken.expiresAt < new Date()) {
    throw new ApiAuthError("API token expired", 401, "TOKEN_EXPIRED");
  }

  if (options?.apiSlug && apiToken.apiProduct.slug !== options.apiSlug) {
    throw new ApiAuthError("Token not valid for this API", 403, "WRONG_API");
  }

  if (!apiToken.apiProduct.isActive) {
    throw new ApiAuthError("API product is inactive", 403, "API_INACTIVE");
  }

  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: apiToken.userId,
      apiProductId: apiToken.apiProductId,
      ...activeSubscriptionWhere(),
    },
  });

  if (!subscription) {
    throw new ApiAuthError("No active subscription", 403, "NO_SUBSCRIPTION");
  }

  const rateLimit = await checkRateLimit(
    apiToken.id,
    apiToken.apiProductId,
    apiToken.apiProduct.rateLimit
  );

  if (!rateLimit.allowed) {
    throw new ApiAuthError(
      `Rate limit exceeded (${apiToken.apiProduct.rateLimit}/hour)`,
      429,
      "RATE_LIMIT_EXCEEDED"
    );
  }

  return { apiToken, subscription };
}

export async function logApiUsage(params: {
  userId: string;
  apiProductId: string;
  apiTokenId?: string;
  endpoint: string;
  method: string;
  statusCode: number;
  latencyMs?: number;
  ipAddress?: string | null;
}) {
  const [log] = await Promise.all([
    prisma.apiUsageLog.create({ data: params }),
    params.apiTokenId
      ? prisma.apiToken.update({
          where: { id: params.apiTokenId },
          data: { lastUsedAt: new Date() },
        })
      : Promise.resolve(),
  ]);
  return log;
}
