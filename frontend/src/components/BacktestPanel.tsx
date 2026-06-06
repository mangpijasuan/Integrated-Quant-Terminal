import { useEffect, useState } from "react";

import {
  createBacktest,
  getBacktest,
  getBacktestProjects,
  getBacktestRuntime,
  listBacktests,
} from "../api/client";
import type { BacktestJob, BacktestRuntime, BacktestSummary } from "../types";

const TERMINAL_STATS = [
  "Total Orders",
  "Net Profit",
  "Compounding Annual Return",
  "Sharpe Ratio",
  "Drawdown",
  "Win Rate",
];

export default function BacktestPanel() {
  const [runtime, setRuntime] = useState<BacktestRuntime | null>(null);
  const [projects, setProjects] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState("BuyAndHoldSPY");
  const [jobs, setJobs] = useState<BacktestJob[]>([]);
  const [activeJob, setActiveJob] = useState<BacktestJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [runtimeStatus, projectList, backtests] = await Promise.all([
          getBacktestRuntime(),
          getBacktestProjects(),
          listBacktests(),
        ]);

        setRuntime(runtimeStatus);
        setProjects(projectList.projects);
        setSelectedProject(projectList.projects[0] ?? "BuyAndHoldSPY");
        setJobs(backtests);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load backtest runtime");
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (!activeJob || activeJob.status === "completed" || activeJob.status === "failed") {
      return;
    }

    const interval = window.setInterval(() => {
      void getBacktest(activeJob.id)
        .then((job) => {
          setActiveJob(job);
          setJobs((current) => current.map((entry) => (entry.id === job.id ? job : entry)));
        })
        .catch((pollError) => {
          setError(pollError instanceof Error ? pollError.message : "Failed to poll backtest");
        });
    }, 2000);

    return () => window.clearInterval(interval);
  }, [activeJob]);

  const handleRunBacktest = async () => {
    setLoading(true);
    setError(null);

    try {
      const job = await createBacktest({ project: selectedProject });
      setActiveJob(job);
      setJobs((current) => [job, ...current]);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Failed to start backtest");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card backtest-panel">
      <h2>Lean Backtesting</h2>
      <p className="muted">
        Launch local QuantConnect Lean backtests through the API and inspect summary statistics.
      </p>

      {runtime && (
        <div className="runtime-banner">
          <p className={`badge ${runtime.ready ? "ok" : "warn"}`}>
            {runtime.ready ? "Lean runtime ready" : "Lean runtime needs setup"}
          </p>
          {!runtime.ready && (
            <ul className="issue-list">
              {runtime.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="backtest-controls">
        <label htmlFor="project">Strategy project</label>
        <select
          id="project"
          value={selectedProject}
          onChange={(event) => setSelectedProject(event.target.value)}
          disabled={projects.length === 0}
        >
          {projects.map((project) => (
            <option key={project} value={project}>
              {project}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => void handleRunBacktest()} disabled={loading || !runtime?.ready}>
          {loading ? "Starting..." : "Run Backtest"}
        </button>
      </div>

      {error && <pre className="response error">{error}</pre>}

      {activeJob && (
        <div className="active-job">
          <h3>Latest run</h3>
          <dl>
            <div>
              <dt>Job ID</dt>
              <dd>{activeJob.id}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{activeJob.status}</dd>
            </div>
            <div>
              <dt>Project</dt>
              <dd>{activeJob.project}</dd>
            </div>
          </dl>
          {activeJob.error && <pre className="response error">{activeJob.error}</pre>}
          {activeJob.summary && <BacktestSummaryView summary={activeJob.summary} />}
        </div>
      )}

      {jobs.length > 0 && (
        <div className="job-history">
          <h3>Recent backtests</h3>
          <div className="job-table">
            {jobs.slice(0, 5).map((job) => (
              <button
                key={job.id}
                type="button"
                className="job-row"
                onClick={() => setActiveJob(job)}
              >
                <span>{job.project}</span>
                <span>{job.status}</span>
                <span>{new Date(job.createdAt).toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function BacktestSummaryView({ summary }: { summary: BacktestSummary }) {
  return (
    <div className="summary-grid">
      {TERMINAL_STATS.map((stat) => (
        <article key={stat} className="summary-card">
          <p className="summary-label">{stat}</p>
          <p className="summary-value">{summary.statistics[stat] ?? "n/a"}</p>
        </article>
      ))}
    </div>
  );
}
