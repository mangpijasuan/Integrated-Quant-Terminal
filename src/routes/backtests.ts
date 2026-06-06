import { Router } from "express";
import { z } from "zod";

import { getLeanRuntimeStatus, readLeanBacktestSummary } from "../services/backtest/lean-runner.js";
import { enqueueBacktest, getActiveBacktestJobId } from "../services/backtest/queue.js";
import { backtestStore } from "../services/backtest/store.js";

const router = Router();

const createBacktestSchema = z.object({
  project: z.string().min(1),
  parameters: z.record(z.string(), z.string()).optional(),
});

const toPublicJob = (job: NonNullable<ReturnType<typeof backtestStore.get>>) => ({
  id: job.id,
  project: job.project,
  status: job.status,
  createdAt: job.createdAt,
  startedAt: job.startedAt,
  completedAt: job.completedAt,
  error: job.error,
  summary: job.summary,
  parameters: job.parameters,
});

router.get("/runtime", async (_req, res, next) => {
  try {
    const runtime = await getLeanRuntimeStatus();
    res.status(200).json({
      ...runtime,
      activeJobId: getActiveBacktestJobId(),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/projects", async (_req, res, next) => {
  try {
    const runtime = await getLeanRuntimeStatus();
    res.status(200).json({
      projects: runtime.projects,
      ready: runtime.ready,
      issues: runtime.issues,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", (_req, res) => {
  res.status(200).json({
    data: backtestStore.list().map(toPublicJob),
  });
});

router.post("/", async (req, res, next) => {
  try {
    const payload = createBacktestSchema.parse(req.body);
    const runtime = await getLeanRuntimeStatus();

    if (!runtime.projects.includes(payload.project)) {
      res.status(400).json({
        error: {
          message: `Unknown Lean project "${payload.project}".`,
          code: "UNKNOWN_PROJECT",
          details: { projects: runtime.projects },
        },
      });
      return;
    }

    if (!runtime.ready) {
      res.status(503).json({
        error: {
          message: "Lean runtime is not ready.",
          code: "LEAN_NOT_READY",
          details: { issues: runtime.issues },
        },
      });
      return;
    }

    const job = enqueueBacktest(payload);
    res.status(202).json({ data: toPublicJob(job) });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", (req, res) => {
  const job = backtestStore.get(req.params.id);

  if (!job) {
    res.status(404).json({
      error: {
        message: "Backtest job not found.",
        code: "BACKTEST_NOT_FOUND",
      },
    });
    return;
  }

  res.status(200).json({ data: toPublicJob(job) });
});

router.get("/:id/results", async (req, res, next) => {
  try {
    const job = backtestStore.get(req.params.id);

    if (!job) {
      res.status(404).json({
        error: {
          message: "Backtest job not found.",
          code: "BACKTEST_NOT_FOUND",
        },
      });
      return;
    }

    if (job.status !== "completed" || !job.outputDir) {
      res.status(409).json({
        error: {
          message: "Backtest results are not available yet.",
          code: "BACKTEST_NOT_COMPLETED",
          details: { status: job.status },
        },
      });
      return;
    }

    const parsed = await readLeanBacktestSummary(job.outputDir);

    res.status(200).json({
      data: parsed.raw,
      summary: job.summary,
    });
  } catch (error) {
    next(error);
  }
});

export { router as backtestsRouter };
