import { Router } from "express";
import { prisma } from "../lib/prisma";
import { generateApiToken } from "../lib/tokens";
import { activeSubscriptionWhere } from "../lib/subscriptions";
import {
  handleRouteError,
  jsonError,
  parseBody,
  requireSession,
  serializeApiToken,
} from "../lib/api-helpers";
import { createTokenSchema } from "../lib/validators";

const router = Router();

const renameTokenSchema = createTokenSchema.pick({ name: true });

router.get("/", async (req, res) => {
  const session = await requireSession(req, res);
  if (!session) return;

  const tokens = await prisma.apiToken.findMany({
    where: { userId: session.id },
    include: { apiProduct: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });

  return res.json(tokens.map(serializeApiToken));
});

router.post("/", async (req, res) => {
  const session = await requireSession(req, res);
  if (!session) return;

  try {
  const data = parseBody(req, res, createTokenSchema);
  if (!data) return;
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: session.id,
        apiProductId: data.apiProductId,
        ...activeSubscriptionWhere(),
      },
    });

    if (!subscription) {
      return jsonError(res, "Active subscription required", 403);
    }

    const { token, hash, prefix } = generateApiToken();

    await prisma.apiToken.create({
      data: {
        userId: session.id,
        apiProductId: data.apiProductId,
        name: data.name,
        tokenHash: hash,
        tokenPrefix: prefix,
      },
    });

    return res.status(201).json({ token });
  } catch (error) {
    return handleRouteError(res, error, "Failed to create token");
  }
});

router.patch("/:id", async (req, res) => {
  const session = await requireSession(req, res);
  if (!session) return;

  try {
  const data = parseBody(req, res, renameTokenSchema);
  if (!data) return;

    const token = await prisma.apiToken.findUnique({ where: { id: req.params.id } });
  if (!token || token.userId !== session.id) {
    return jsonError(res, "Not found", 404);
  }

    const updated = await prisma.apiToken.update({
      where: { id: req.params.id },
      data: { name: data.name.trim() },
      include: { apiProduct: { select: { name: true, slug: true } } },
    });

    return res.json(serializeApiToken(updated));
  } catch (error) {
    return handleRouteError(res, error, "Failed to update token");
  }
});

router.delete("/:id", async (req, res) => {
  const session = await requireSession(req, res);
  if (!session) return;

  const token = await prisma.apiToken.findUnique({ where: { id: req.params.id } });

  if (!token || token.userId !== session.id) {
    return jsonError(res, "Not found", 404);
  }

  await prisma.apiToken.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });

  return res.json({ success: true });
});

export default router;
