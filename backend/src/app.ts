import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { getFrontendUrl } from "./lib/utils";
import { optionalSession } from "./middleware/auth";

import apiRoutes from "./routes";

const app = express();

app.use(
  cors({
    origin: getFrontendUrl(),
    credentials: true,
  })
);

app.use(cookieParser());

app.use(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" })
);

app.use((req, res, next) => {
  if (
    req.originalUrl === "/api/stripe/webhook" ||
    req.originalUrl.startsWith("/api/gateway")
  ) {
    return next();
  }
  express.json()(req, res, next);
});

app.use(
  "/api/gateway",
  express.raw({ type: "*/*", limit: "10mb" })
);

app.use(optionalSession);

app.use("/api", apiRoutes);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

export default app;
