import { Router } from "express";

import { collectMetrics, contentType } from "../lib/metrics.js";

export const healthRouter = Router();

healthRouter.get("/healthz", (_req, res) => {
  res.status(200).json({
    status: "ok",
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get("/readyz", (_req, res) => {
  // Extend with dependency checks (DB, cache, queue) in production.
  res.status(200).json({
    status: "ready",
  });
});

healthRouter.get("/metrics", async (_req, res, next) => {
  try {
    res.setHeader("Content-Type", contentType);
    res.send(await collectMetrics());
  } catch (error) {
    next(error);
  }
});
