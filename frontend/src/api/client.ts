import type {
  ApiInfo,
  BacktestJob,
  BacktestProjectsResponse,
  BacktestRuntime,
  EchoResponse,
  HealthStatus,
  ReadinessStatus,
} from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function getHealth(): Promise<HealthStatus> {
  return request<HealthStatus>("/healthz");
}

export function getReadiness(): Promise<ReadinessStatus> {
  return request<ReadinessStatus>("/readyz");
}

export function getApiInfo(): Promise<ApiInfo> {
  return request<ApiInfo>("/api/v1");
}

export function postEcho(message: string): Promise<EchoResponse> {
  return request<EchoResponse>("/api/v1/echo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
}

export function getBacktestRuntime(): Promise<BacktestRuntime> {
  return request<BacktestRuntime>("/api/v1/backtests/runtime");
}

export function getBacktestProjects(): Promise<BacktestProjectsResponse> {
  return request<BacktestProjectsResponse>("/api/v1/backtests/projects");
}

export function listBacktests(): Promise<BacktestJob[]> {
  return request<{ data: BacktestJob[] }>("/api/v1/backtests").then((response) => response.data);
}

export function createBacktest(input: {
  project: string;
  parameters?: Record<string, string>;
}): Promise<BacktestJob> {
  return request<{ data: BacktestJob }>("/api/v1/backtests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((response) => response.data);
}

export function getBacktest(id: string): Promise<BacktestJob> {
  return request<{ data: BacktestJob }>(`/api/v1/backtests/${id}`).then((response) => response.data);
}
