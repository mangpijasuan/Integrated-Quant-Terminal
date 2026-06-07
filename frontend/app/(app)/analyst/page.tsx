"use client";
import { useState } from "react";
import { Search, Brain, Zap, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";
import { apiPost } from "@/shared/api";
import AnalystReport, { AnalystReportData } from "@/components/analyst/AnalystReport";
import Spinner from "@/components/ui/Spinner";

const SUGGESTIONS = ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "META", "GOOGL", "BRK-B"];

const STEPS = [
  "Fetching market data...",
  "Running fundamental analysis...",
  "Building DCF model...",
  "Consulting AI investor personas...",
  "Generating bull & bear cases...",
  "Compiling report...",
];

export default function AnalystPage() {
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [report, setReport] = useState<AnalystReportData | null>(null);

  async function analyze(sym?: string) {
    const symbol = (sym || ticker).trim().toUpperCase();
    if (!symbol) return;
    setTicker(symbol);
    setLoading(true);
    setReport(null);
    setStepIdx(0);

    // Step animation
    let step = 0;
    const stepTimer = setInterval(() => {
      step++;
      if (step < STEPS.length) setStepIdx(step);
    }, 1200);

    try {
      const data = await apiPost<AnalystReportData>("/api/analyst/analyze", {
        ticker: symbol,
      });
      setReport(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      clearInterval(stepTimer);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Brain className="w-5 h-5 text-terminal-accent" />
          <h1 className="text-lg font-semibold text-terminal-text">AI Stock Analyst</h1>
          <span className="text-xs font-mono text-terminal-dim border border-terminal-border rounded px-2 py-0.5">
            Powered by Gemini
          </span>
        </div>
        <p className="text-sm text-terminal-dim">
          Instant AI-powered analysis with bull/bear thesis, DCF estimate, and investor perspectives.
        </p>
      </div>

      {/* Search bar */}
      <div className="bg-terminal-surface border border-terminal-border rounded-lg p-5 mb-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-terminal-dim" />
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && analyze()}
              placeholder="Enter ticker symbol (AAPL, TSLA, BTC-USD...)"
              className="w-full bg-terminal-muted border border-terminal-border rounded-lg pl-10 pr-4 py-3 text-sm font-mono text-terminal-text placeholder:text-terminal-dim/50 focus:outline-none focus:border-terminal-accent/50 transition-colors text-lg"
            />
          </div>
          <button
            onClick={() => analyze()}
            disabled={loading || !ticker.trim()}
            className="px-6 py-3 bg-terminal-accent text-terminal-bg font-semibold rounded-lg text-sm hover:bg-terminal-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 glow-accent"
          >
            {loading ? <Spinner size={16} /> : <Zap className="w-4 h-4" />}
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>

        {/* Suggestions */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-xs text-terminal-dim font-mono">Try:</span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => analyze(s)}
              disabled={loading}
              className="text-xs font-mono px-2.5 py-1 bg-terminal-muted border border-terminal-border rounded hover:border-terminal-accent/40 hover:text-terminal-accent text-terminal-dim transition-colors disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-terminal-surface border border-terminal-border rounded-lg p-10 text-center animate-fade-in">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full border-2 border-terminal-accent/20 border-t-terminal-accent animate-spin" />
          </div>
          <div className="text-terminal-accent font-mono text-sm mb-2">
            Analyzing {ticker}
          </div>
          <div className="text-terminal-dim text-xs font-mono animate-pulse">
            {STEPS[stepIdx]}
          </div>
          <div className="flex justify-center gap-1.5 mt-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i <= stepIdx ? "bg-terminal-accent" : "bg-terminal-border"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Report */}
      {!loading && report && <AnalystReport report={report} />}

      {/* Empty state */}
      {!loading && !report && (
        <div className="text-center py-16 text-terminal-dim">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 text-terminal-border" />
          <p className="text-sm mb-1">Enter a ticker to get your AI analysis</p>
          <p className="text-xs font-mono">
            Supports US stocks, ETFs, crypto (BTC-USD), and more
          </p>
        </div>
      )}
    </div>
  );
}
