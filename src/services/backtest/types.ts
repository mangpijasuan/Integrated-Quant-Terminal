export type BacktestStatus = "queued" | "running" | "completed" | "failed";

export type BacktestSummary = {
  statistics: Record<string, string>;
  runtimeStatistics: Record<string, string>;
};

export type BacktestJob = {
  id: string;
  project: string;
  status: BacktestStatus;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  outputDir: string | null;
  summary: BacktestSummary | null;
  parameters: Record<string, string>;
};

export type LeanRuntimeStatus = {
  ready: boolean;
  leanRoot: string;
  leanCliPath: string;
  issues: string[];
  projects: string[];
};

export type LeanBacktestResultFile = {
  Statistics?: Record<string, string>;
  RuntimeStatistics?: Record<string, string>;
  TotalPerformance?: {
    PortfolioStatistics?: Record<string, string | number>;
    TradeStatistics?: Record<string, string | number>;
  };
};
