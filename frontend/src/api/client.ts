import type { ApiInfo, EchoResponse, HealthStatus, ReadinessStatus } from "../types";

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
