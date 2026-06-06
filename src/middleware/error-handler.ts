import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

type ErrorWithStatus = Error & { status?: number; details?: unknown };

export function errorHandler(
  error: ErrorWithStatus,
  req: Request,
  res: Response,
  _next: NextFunction, // Express error signature requires this arg.
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        message: "Validation failed",
        code: "VALIDATION_FAILED",
        details: error.flatten(),
      },
    });
    return;
  }

  const status = error.status ?? 500;

  req.log?.error(
    {
      err: error,
      details: error.details,
      status,
      path: req.originalUrl,
      method: req.method,
    },
    "Unhandled request error",
  );

  res.status(status).json({
    error: {
      message: status >= 500 ? "Internal server error" : error.message,
      code: status >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR",
      ...(error.details ? { details: error.details } : {}),
    },
  });
}
