import { Router } from "express";
import { prisma } from "../lib/prisma";
import { slugify } from "../lib/utils";
import {
  handleRouteError,
  jsonError,
  parseBody,
  requireAdmin,
  serializeApiProduct,
} from "../lib/api-helpers";
import { apiProductFieldsSchema, updateApiProductSchema } from "../lib/validators";

const router = Router();

router.get("/", async (req, res) => {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const apis = await prisma.apiProduct.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { subscriptions: true, apiTokens: true } },
    },
  });

  return res.json(
    apis.map((api) => ({
      ...serializeApiProduct(api),
      stats: {
        subscriptions: api._count.subscriptions,
        tokens: api._count.apiTokens,
      },
    }))
  );
});

router.post("/", async (req, res) => {
  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
  const data = parseBody(req, res, apiProductFieldsSchema);
  if (!data) return;
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

    return res.status(201).json(serializeApiProduct(api));
  } catch (error) {
    return handleRouteError(res, error, "Failed to create API");
  }
});

router.get("/:id", async (req, res) => {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const api = await prisma.apiProduct.findUnique({
    where: { id: req.params.id },
    include: {
      _count: { select: { subscriptions: true, apiTokens: true, usageLogs: true } },
    },
  });

  if (!api) return jsonError(res, "Not found", 404);

  return res.json({
    ...serializeApiProduct(api),
    stats: {
      subscriptions: api._count.subscriptions,
      tokens: api._count.apiTokens,
      totalCalls: api._count.usageLogs,
    },
  });
});

router.patch("/:id", async (req, res) => {
  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
  const data = parseBody(req, res, updateApiProductSchema);
  if (!data) return;
    const updateData: Record<string, unknown> = { ...data };
    if (data.features) {
      updateData.features = JSON.stringify(data.features);
    }

    const api = await prisma.apiProduct.update({
      where: { id: req.params.id },
      data: updateData,
    });

    return res.json(serializeApiProduct(api));
  } catch (error) {
    return handleRouteError(res, error, "Failed to update API");
  }
});

router.delete("/:id", async (req, res) => {
  const session = await requireAdmin(req, res);
  if (!session) return;

  await prisma.apiProduct.delete({ where: { id: req.params.id } });
  return res.json({ success: true });
});

export default router;
