import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { zingteApis } from "./zingte-apis";

const prisma = new PrismaClient();

const DEMO_API_TOKEN =
  "zt_demo_acme_llm_token_for_testing_only_0000000000000000";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function main() {
  const adminHash = await bcrypt.hash("admin123", 12);
  const demoHash = await bcrypt.hash("demo123", 12);

  await prisma.user.upsert({
    where: { email: "admin@zingte.com" },
    update: { emailVerifiedAt: new Date() },
    create: {
      email: "admin@zingte.com",
      passwordHash: adminHash,
      name: "Admin User",
      role: "ADMIN",
      emailVerifiedAt: new Date(),
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: "demo@acme.com" },
    update: { emailVerifiedAt: new Date() },
    create: {
      email: "demo@acme.com",
      passwordHash: demoHash,
      name: "John Smith",
      company: "Acme Corporation",
      role: "CUSTOMER",
      emailVerifiedAt: new Date(),
    },
  });

  const catalogSlugs = new Set(zingteApis.map((a) => a.slug));

  await prisma.apiProduct.deleteMany({
    where: { slug: { notIn: [...catalogSlugs] } },
  });

  for (const api of zingteApis) {
    await prisma.apiProduct.upsert({
      where: { slug: api.slug },
      update: {
        name: api.name,
        description: api.description,
        category: api.category,
        baseUrl: api.baseUrl,
        priceMonthly: api.priceMonthly,
        priceYearly: api.priceYearly,
        rateLimit: api.rateLimit,
        features: JSON.stringify(api.features),
        documentation: api.documentation,
        isActive: true,
      },
      create: {
        name: api.name,
        slug: api.slug,
        description: api.description,
        category: api.category,
        baseUrl: api.baseUrl,
        priceMonthly: api.priceMonthly,
        priceYearly: api.priceYearly,
        rateLimit: api.rateLimit,
        features: JSON.stringify(api.features),
        documentation: api.documentation,
      },
    });
  }

  const llmApi = await prisma.apiProduct.findUnique({
    where: { slug: "llm" },
  });

  if (llmApi) {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await prisma.subscription.upsert({
      where: {
        userId_apiProductId: {
          userId: customer.id,
          apiProductId: llmApi.id,
        },
      },
      update: {
        status: "ACTIVE",
        apiProductId: llmApi.id,
        price: llmApi.priceMonthly,
        expiresAt,
      },
      create: {
        userId: customer.id,
        apiProductId: llmApi.id,
        status: "ACTIVE",
        billingCycle: "MONTHLY",
        price: llmApi.priceMonthly,
        expiresAt,
      },
    });

    const tokenHash = hashToken(DEMO_API_TOKEN);
    await prisma.apiToken.upsert({
      where: { tokenHash },
      update: {
        name: "Demo Token",
        isActive: true,
        userId: customer.id,
        apiProductId: llmApi.id,
      },
      create: {
        userId: customer.id,
        apiProductId: llmApi.id,
        name: "Demo Token",
        tokenHash,
        tokenPrefix: DEMO_API_TOKEN.slice(0, 12) + "...",
      },
    });

    await prisma.apiUsageLog.createMany({
      data: [
        {
          userId: customer.id,
          apiProductId: llmApi.id,
          endpoint: "/api/verify",
          method: "POST",
          statusCode: 200,
          latencyMs: 42,
        },
        {
          userId: customer.id,
          apiProductId: llmApi.id,
          endpoint: `/api/gateway/llm/chat`,
          method: "POST",
          statusCode: 200,
          latencyMs: 128,
        },
      ],
    });
  }

  console.log("Seed completed:");
  console.log(`  Admin: admin@zingte.com / admin123`);
  console.log(`  Customer: demo@acme.com / demo123`);
  console.log(`  APIs: ${zingteApis.length} Zingte AI products loaded`);
  console.log(`  Demo API token (LLM): ${DEMO_API_TOKEN}`);
  console.log(`  Run "npm run stripe:sync" to create Stripe products & prices`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
