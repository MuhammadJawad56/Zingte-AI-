import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { slugify } from "@/lib/utils";

const createApiSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  category: z.string().min(2),
  baseUrl: z.string().url(),
  version: z.string().default("v1"),
  priceMonthly: z.number().positive(),
  priceYearly: z.number().positive(),
  rateLimit: z.number().int().positive().default(1000),
  features: z.array(z.string()).min(1),
  documentation: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apis = await prisma.apiProduct.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { subscriptions: true, apiTokens: true } },
    },
  });

  return NextResponse.json(apis);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createApiSchema.parse(body);

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

    return NextResponse.json(api, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create API" }, { status: 500 });
  }
}
