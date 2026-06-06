import type { NextFunction, Request, Response } from "express";
import pino from "pino";

export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "res.headers.set-cookie"],
    censor: "[REDACTED]",
  },
});

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  const onFinish = () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    logger.info(
      {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
        remoteAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
      "request completed",
    );
  };
  res.on("finish", onFinish);

  next();
}
