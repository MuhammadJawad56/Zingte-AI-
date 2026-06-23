import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import {
  handleRouteError,
  isErrorResponse,
  parseBody,
  requireAdmin,
  serializeApiProduct,
} from "@/lib/api-helpers";
import { apiProductFieldsSchema } from "@/lib/validators";

export async function GET() {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const apis = await prisma.apiProduct.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { subscriptions: true, apiTokens: true } },
    },
  });

  return NextResponse.json(
    apis.map((api) => ({
      ...serializeApiProduct(api),
      stats: {
        subscriptions: api._count.subscriptions,
        tokens: api._count.apiTokens,
      },
    }))
  );
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const data = await parseBody(request, apiProductFieldsSchema);
  if (isErrorResponse(data)) return data;

  try {
    let slug = slugify(data.name);
    const existing = await prisma.apiProduct.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now()}`;

    const api = await prisma.apiProduct.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        category: data.category,
        baseUrl: data.baseUrl,
        version: data.version,
        priceMonthly: data.priceMonthly,
        priceYearly: data.priceYearly,
        rateLimit: data.rateLimit,
        features: JSON.stringify(data.features),
        documentation: data.documentation,
      },
    });

    return NextResponse.json(serializeApiProduct(api), { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Failed to create API");
  }
}
