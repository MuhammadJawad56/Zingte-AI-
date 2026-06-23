import { Router } from "express";
import { expireStaleSubscriptions } from "../lib/subscription-jobs";

const router = Router();

router.post("/subscriptions", async (req, res) => {
  const secret = req.headers["x-cron-secret"] as string | undefined;
  const expected = process.env.CRON_SECRET;

  if (!expected || secret !== expected) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const result = await expireStaleSubscriptions();
  return res.json({
    success: true,
    ...result,
    timestamp: new Date().toISOString(),
  });
});

export default router;
