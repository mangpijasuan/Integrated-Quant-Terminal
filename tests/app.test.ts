import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";

describe("App", () => {
  const app = createApp();

  it("returns health status", async () => {
    const response = await request(app).get("/health/healthz");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.headers["x-request-id"]).toBeDefined();
  });

  it("returns readiness status", async () => {
    const response = await request(app).get("/health/readyz");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ready");
  });

  it("echoes valid API payload", async () => {
    const response = await request(app).post("/api/v1/echo").send({
      message: "Ship robust software",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.message).toBe("Ship robust software");
    expect(response.body.requestId).toBeDefined();
  });

  it("rejects invalid message payload", async () => {
    const response = await request(app).post("/api/v1/echo").send({
      message: "",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("returns Prometheus metrics", async () => {
    const response = await request(app).get("/health/metrics");

    expect(response.status).toBe(200);
    expect(response.text).toContain("process_cpu_user_seconds_total");
    expect(response.headers["content-type"]).toContain("text/plain");
  });
});
