import { Router } from "express";
import { requireSession } from "../lib/api-helpers";
import { getUsageSummary } from "../lib/rate-limit";

const router = Router();

router.get("/", async (req, res) => {
  const session = await requireSession(req, res);
  if (!session) return;

  const days = Math.min(
    90,
    Math.max(1, parseInt((req.query.days as string) || "30", 10) || 30)
  );

  const summary = await getUsageSummary(session.id, days);
  return res.json(summary);
});

export default router;
