import type { BacktestJob } from "./types.js";

const jobs = new Map<string, BacktestJob>();

export const backtestStore = {
  create(job: BacktestJob): BacktestJob {
    jobs.set(job.id, job);
    return job;
  },

  get(id: string): BacktestJob | undefined {
    return jobs.get(id);
  },

  list(): BacktestJob[] {
    return [...jobs.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  },

  update(id: string, patch: Partial<BacktestJob>): BacktestJob | undefined {
    const current = jobs.get(id);
    if (!current) {
      return undefined;
    }

    const updated = { ...current, ...patch };
    jobs.set(id, updated);
    return updated;
  },

  clear(): void {
    jobs.clear();
  },
};
