import { Router } from "express";
import { z } from "zod";

const router = Router();

const echoSchema = z.object({
  message: z.string().min(1).max(500),
});

router.get("/", (_req, res) => {
  res.json({
    service: "integrated-terminal-api",
    version: "v1",
    docs: "Use POST /api/v1/echo with JSON body { message: string }",
  });
});

router.post("/echo", (req, res, next) => {
  try {
    const payload = echoSchema.parse(req.body);
    res.status(200).json({
      data: payload,
      receivedAt: new Date().toISOString(),
      requestId: req.requestId,
    });
  } catch (error) {
    next(error);
  }
});

export { router as v1Router };
