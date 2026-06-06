import { mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { readLeanBacktestSummary, runLeanBacktest } from "./lean-runner.js";
import { backtestStore } from "./store.js";
import type { BacktestJob } from "./types.js";

let activeJobId: string | null = null;

async function processJob(jobId: string): Promise<void> {
  const job = backtestStore.get(jobId);
  if (!job) {
    return;
  }

  activeJobId = jobId;
  backtestStore.update(jobId, {
    status: "running",
    startedAt: new Date().toISOString(),
  });

  try {
    const outputDir = path.resolve(env.LEAN_ROOT, "backtests", jobId);
    await mkdir(outputDir, { recursive: true });

    await runLeanBacktest({
      project: job.project,
      outputDir,
      parameters: job.parameters,
    });

    const summary = await readLeanBacktestSummary(outputDir);

    backtestStore.update(jobId, {
      status: "completed",
      completedAt: new Date().toISOString(),
      outputDir,
      summary: {
        statistics: summary.statistics,
        runtimeStatistics: summary.runtimeStatistics,
      },
      error: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lean backtest failed";

    logger.error({ err: error, jobId }, "Backtest job failed");
    backtestStore.update(jobId, {
      status: "failed",
      completedAt: new Date().toISOString(),
      error: message,
    });
  } finally {
    activeJobId = null;
  }
}

export function enqueueBacktest(input: {
  project: string;
  parameters?: Record<string, string>;
}): BacktestJob {
  const job: BacktestJob = {
    id: randomUUID(),
    project: input.project,
    status: "queued",
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    error: null,
    outputDir: null,
    summary: null,
    parameters: input.parameters ?? {},
  };

  backtestStore.create(job);

  setImmediate(() => {
    void processJob(job.id);
  });

  return job;
}

export function getActiveBacktestJobId(): string | null {
  return activeJobId;
}
