import { collectDefaultMetrics, Counter, Registry } from "prom-client";

export const register = new Registry();
collectDefaultMetrics({ register });
export const contentType = register.contentType;

const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

export const collectMetrics = async () => register.metrics();

export const recordHttpRequest = (method: string, route: string, statusCode: number) => {
  httpRequestsTotal.inc({ method, route, status_code: String(statusCode) });
};
