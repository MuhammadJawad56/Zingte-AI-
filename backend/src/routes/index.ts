import { Router } from "express";
import authRoutes from "./auth";
import apisRoutes from "./apis";
import tokensRoutes from "./tokens";
import subscriptionsRoutes from "./subscriptions";
import stripeRoutes from "./stripe";
import catalogRoutes from "./catalog";
import userRoutes from "./user";
import adminRoutes from "./admin";
import usageRoutes from "./usage";
import healthRoutes from "./health";
import verifyRoutes from "./verify";
import gatewayRoutes from "./gateway";
import cronRoutes from "./cron";

const router = Router();

router.use("/auth", authRoutes);
router.use("/apis", apisRoutes);
router.use("/tokens", tokensRoutes);
router.use("/subscriptions", subscriptionsRoutes);
router.use("/stripe", stripeRoutes);
router.use("/catalog", catalogRoutes);
router.use("/user", userRoutes);
router.use("/admin", adminRoutes);
router.use("/usage", usageRoutes);
router.use("/health", healthRoutes);
router.use("/verify", verifyRoutes);
router.use("/gateway", gatewayRoutes);
router.use("/cron", cronRoutes);

export default router;
