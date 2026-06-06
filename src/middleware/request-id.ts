import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

export function attachRequestId(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.header("x-request-id") || randomUUID();
  req.requestId = requestId;
  req.headers["x-request-id"] = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}
