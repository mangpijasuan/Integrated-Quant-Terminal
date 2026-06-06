export type HealthStatus = {
  status: string;
  uptimeSeconds: number;
  timestamp: string;
};

export type ReadinessStatus = {
  status: string;
};

export type ApiInfo = {
  service: string;
  version: string;
  docs: string;
};

export type EchoResponse = {
  data: {
    message: string;
  };
  receivedAt: string;
  requestId: string;
};

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
  summary: BacktestSummary | null;
  parameters: Record<string, string>;
};

export type DockerStatus = {
  installed: boolean;
  running: boolean;
  message: string;
  setup: string[];
};

export type BacktestRuntime = {
  ready: boolean;
  leanRoot: string;
  leanCliPath: string;
  issues: string[];
  projects: string[];
  activeJobId: string | null;
  docker: DockerStatus;
};

export type BacktestProjectsResponse = {
  projects: string[];
  ready: boolean;
  issues: string[];
};
