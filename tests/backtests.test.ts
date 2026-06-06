import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { backtestStore } from "../src/services/backtest/store.js";

describe("Backtests API", () => {
  const app = createApp();

  afterEach(() => {
    backtestStore.clear();
  });

  it("reports Lean runtime status", async () => {
    const response = await request(app).get("/api/v1/backtests/runtime");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("ready");
    expect(response.body).toHaveProperty("projects");
    expect(response.body).toHaveProperty("docker");
    expect(response.body.docker).toHaveProperty("running");
    expect(response.body.projects).toContain("BuyAndHoldSPY");
  });

  it("lists available Lean projects", async () => {
    const response = await request(app).get("/api/v1/backtests/projects");

    expect(response.status).toBe(200);
    expect(response.body.projects).toContain("BuyAndHoldSPY");
  });

  it("rejects unknown projects", async () => {
    const response = await request(app).post("/api/v1/backtests").send({
      project: "DoesNotExist",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("UNKNOWN_PROJECT");
  });

  it("returns an empty backtest list initially", async () => {
    const response = await request(app).get("/api/v1/backtests");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });
});
