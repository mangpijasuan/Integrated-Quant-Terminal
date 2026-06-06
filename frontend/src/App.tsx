import { useEffect, useState } from "react";

import { getApiInfo, getHealth, getReadiness, postEcho } from "./api/client";
import BacktestPanel from "./components/BacktestPanel";
import type { ApiInfo, EchoResponse, HealthStatus, ReadinessStatus } from "./types";
import "./App.css";

type StatusState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

const initialStatus = <T,>(): StatusState<T> => ({
  data: null,
  error: null,
  loading: true,
});

export default function App() {
  const [health, setHealth] = useState(initialStatus<HealthStatus>());
  const [readiness, setReadiness] = useState(initialStatus<ReadinessStatus>());
  const [apiInfo, setApiInfo] = useState(initialStatus<ApiInfo>());
  const [message, setMessage] = useState("hello from integrated terminal");
  const [echoResult, setEchoResult] = useState<EchoResponse | null>(null);
  const [echoError, setEchoError] = useState<string | null>(null);
  const [echoLoading, setEchoLoading] = useState(false);

  useEffect(() => {
    const loadStatus = async () => {
      const [healthResult, readinessResult, apiResult] = await Promise.allSettled([
        getHealth(),
        getReadiness(),
        getApiInfo(),
      ]);

      setHealth({
        loading: false,
        data: healthResult.status === "fulfilled" ? healthResult.value : null,
        error: healthResult.status === "rejected" ? String(healthResult.reason) : null,
      });

      setReadiness({
        loading: false,
        data: readinessResult.status === "fulfilled" ? readinessResult.value : null,
        error: readinessResult.status === "rejected" ? String(readinessResult.reason) : null,
      });

      setApiInfo({
        loading: false,
        data: apiResult.status === "fulfilled" ? apiResult.value : null,
        error: apiResult.status === "rejected" ? String(apiResult.reason) : null,
      });
    };

    void loadStatus();
  }, []);

  const handleEcho = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEchoLoading(true);
    setEchoError(null);
    setEchoResult(null);

    try {
      const result = await postEcho(message.trim());
      setEchoResult(result);
    } catch (error) {
      setEchoError(error instanceof Error ? error.message : "Echo request failed");
    } finally {
      setEchoLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="hero">
        <p className="eyebrow">Integrated Quant Terminal</p>
        <h1>Quant Terminal Dashboard</h1>
        <p className="subtitle">
          React frontend connected to the Express API, with Lean backtesting orchestration built in.
        </p>
      </header>

      <section className="grid">
        <article className="card">
          <h2>Health</h2>
          {health.loading && <p className="muted">Checking backend...</p>}
          {health.error && <p className="error">{health.error}</p>}
          {health.data && (
            <dl>
              <div>
                <dt>Status</dt>
                <dd>{health.data.status}</dd>
              </div>
              <div>
                <dt>Uptime</dt>
                <dd>{health.data.uptimeSeconds.toFixed(1)}s</dd>
              </div>
              <div>
                <dt>Timestamp</dt>
                <dd>{health.data.timestamp}</dd>
              </div>
            </dl>
          )}
        </article>

        <article className="card">
          <h2>Readiness</h2>
          {readiness.loading && <p className="muted">Checking readiness...</p>}
          {readiness.error && <p className="error">{readiness.error}</p>}
          {readiness.data && (
            <p className={`badge ${readiness.data.status === "ready" ? "ok" : "warn"}`}>
              {readiness.data.status}
            </p>
          )}
        </article>

        <article className="card">
          <h2>API</h2>
          {apiInfo.loading && <p className="muted">Loading API metadata...</p>}
          {apiInfo.error && <p className="error">{apiInfo.error}</p>}
          {apiInfo.data && (
            <dl>
              <div>
                <dt>Service</dt>
                <dd>{apiInfo.data.service}</dd>
              </div>
              <div>
                <dt>Version</dt>
                <dd>{apiInfo.data.version}</dd>
              </div>
              <div>
                <dt>Docs</dt>
                <dd>{apiInfo.data.docs}</dd>
              </div>
            </dl>
          )}
        </article>
      </section>

      <BacktestPanel />

      <section className="card echo-panel">
        <h2>Echo API</h2>
        <p className="muted">Send a message to `POST /api/v1/echo` and inspect the response.</p>
        <form className="echo-form" onSubmit={(event) => void handleEcho(event)}>
          <label htmlFor="message">Message</label>
          <input
            id="message"
            name="message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Type a message"
            required
          />
          <button type="submit" disabled={echoLoading || message.trim().length === 0}>
            {echoLoading ? "Sending..." : "Send Echo"}
          </button>
        </form>
        {echoError && <pre className="response error">{echoError}</pre>}
        {echoResult && <pre className="response">{JSON.stringify(echoResult, null, 2)}</pre>}
      </section>
    </div>
  );
}
