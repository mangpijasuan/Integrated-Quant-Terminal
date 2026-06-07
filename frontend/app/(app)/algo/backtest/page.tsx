"use client";
import { useEffect, useState } from "react";
import { PlayCircle, TrendingUp, TrendingDown, BarChart2, Cpu, AlertCircle } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import Spinner from "@/components/ui/Spinner";
import toast from "react-hot-toast";

interface BacktestResult {
  engine?: "builtin" | "lean";
  symbol: string;
  strategy: string;
  start_date: string;
  end_date: string;
  total_return: number;
  annualized_return: number;
  sharpe_ratio: number;
  max_drawdown: number;
  win_rate: number;
  total_trades: number;
  profitable_trades: number;
  buy_hold_return: number;
  alpha: number;
  final_value?: number;
  lean_job_id?: string;
}

interface LeanStatus {
  available: boolean;
  docker_running: boolean;
  lean_cli: boolean;
  workspace_ready: boolean;
  credentials_configured: boolean;
  message: string;
}

const STRATEGIES = [
  { value: "rsi_mean_reversion", label: "RSI Mean Reversion (RSI < 30 buy, > 70 sell)" },
  { value: "ma_crossover", label: "MA Crossover (50/200 Golden/Death Cross)" },
  { value: "macd_momentum", label: "MACD Momentum" },
  { value: "bollinger_bands", label: "Bollinger Band Squeeze" },
];

const ENGINES = [
  { value: "builtin", label: "Built-in (yfinance, fast)" },
  { value: "lean", label: "QuantConnect LEAN (Docker, Mac)" },
] as const;

export default function BacktestPage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [strategy, setStrategy] = useState("rsi_mean_reversion");
  const [engine, setEngine] = useState<"builtin" | "lean">("builtin");
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");
  const [initialCapital, setInitialCapital] = useState(10000);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [leanStatus, setLeanStatus] = useState<LeanStatus | null>(null);

  useEffect(() => {
    apiGet<LeanStatus>("/api/algo/lean/status")
      .then(setLeanStatus)
      .catch(() => setLeanStatus(null));
  }, []);

  async function runBacktest() {
    if (engine === "lean" && leanStatus && !leanStatus.available) {
      toast.error(leanStatus.message);
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const data = await apiPost<BacktestResult>("/api/algo/backtest", {
        symbol: symbol.toUpperCase(),
        strategy,
        engine,
        start_date: startDate,
        end_date: endDate,
        initial_capital: initialCapital,
      });
      setResult(data);
      if (data.engine === "lean") {
        toast.success("LEAN backtest completed");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Backtest failed");
    } finally {
      setLoading(false);
    }
  }

  const strategyLabel = result?.strategy.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center gap-2">
        <PlayCircle className="w-5 h-5 text-terminal-accent" />
        <h1 className="text-lg font-semibold">Backtest</h1>
      </div>

      {leanStatus && (
        <div className={`flex items-start gap-3 rounded-lg border p-4 text-xs font-mono ${
          leanStatus.available
            ? "border-terminal-green/30 bg-terminal-green/5 text-terminal-green"
            : "border-terminal-border bg-terminal-muted text-terminal-dim"
        }`}>
          <Cpu className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-terminal-text mb-1">
              LEAN engine: {leanStatus.available ? "Ready" : "Not configured"}
            </div>
            <p>{leanStatus.message}</p>
            {!leanStatus.available && (
              <p className="mt-2 text-terminal-dim">
                Run in terminal: <code className="text-terminal-accent">chmod +x scripts/setup-lean-mac.sh && ./scripts/setup-lean-mac.sh</code>
              </p>
            )}
          </div>
        </div>
      )}

      <div className="bg-terminal-surface border border-terminal-border rounded-lg p-5">
        <h2 className="text-xs font-mono text-terminal-dim uppercase tracking-widest mb-4">Configuration</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-mono text-terminal-dim uppercase tracking-widest mb-1">Engine</label>
            <select value={engine} onChange={e => setEngine(e.target.value as "builtin" | "lean")}
              className="w-full bg-terminal-muted border border-terminal-border rounded px-3 py-2 text-sm font-mono text-terminal-text focus:outline-none focus:border-terminal-accent/50">
              {ENGINES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-mono text-terminal-dim uppercase tracking-widest mb-1">Symbol</label>
            <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())}
              className="w-full bg-terminal-muted border border-terminal-border rounded px-3 py-2 text-sm font-mono text-terminal-text focus:outline-none focus:border-terminal-accent/50" />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-[10px] font-mono text-terminal-dim uppercase tracking-widest mb-1">Strategy</label>
            <select value={strategy} onChange={e => setStrategy(e.target.value)}
              className="w-full bg-terminal-muted border border-terminal-border rounded px-3 py-2 text-sm font-mono text-terminal-text focus:outline-none focus:border-terminal-accent/50">
              {STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-mono text-terminal-dim uppercase tracking-widest mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full bg-terminal-muted border border-terminal-border rounded px-3 py-2 text-sm font-mono text-terminal-text focus:outline-none focus:border-terminal-accent/50" />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-terminal-dim uppercase tracking-widest mb-1">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full bg-terminal-muted border border-terminal-border rounded px-3 py-2 text-sm font-mono text-terminal-text focus:outline-none focus:border-terminal-accent/50" />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-terminal-dim uppercase tracking-widest mb-1">Initial Capital ($)</label>
            <input type="number" value={initialCapital} onChange={e => setInitialCapital(Number(e.target.value))}
              className="w-full bg-terminal-muted border border-terminal-border rounded px-3 py-2 text-sm font-mono text-terminal-text focus:outline-none focus:border-terminal-accent/50" />
          </div>
        </div>

        {engine === "lean" && leanStatus && !leanStatus.credentials_configured && (
          <div className="mt-4 flex items-start gap-2 text-xs font-mono text-terminal-dim bg-terminal-muted/50 border border-terminal-border rounded p-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-terminal-accent" />
            <span>
              For symbols and dates beyond LEAN sample data, run <code className="text-terminal-accent">lean login</code> once
              (free QuantConnect account) so the app can auto-download market data.
            </span>
          </div>
        )}

        <div className="mt-4">
          <button onClick={runBacktest} disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-terminal-accent text-terminal-bg font-semibold rounded-lg text-sm hover:bg-terminal-accent/90 disabled:opacity-50 transition-colors">
            {loading ? <Spinner size={16} /> : <PlayCircle className="w-4 h-4" />}
            {loading
              ? engine === "lean" ? "Running LEAN (Docker)..." : "Running Backtest..."
              : engine === "lean" ? "Run LEAN Backtest" : "Run Backtest"}
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-terminal-surface border border-terminal-border rounded-lg p-5">
            <div className="flex items-center gap-3 mb-4">
              <BarChart2 className="w-4 h-4 text-terminal-accent" />
              <h2 className="text-sm font-semibold text-terminal-text">
                Results — {result.symbol} / {strategyLabel}
                {result.engine === "lean" && (
                  <span className="ml-2 text-[10px] font-mono text-terminal-accent uppercase">LEAN</span>
                )}
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total Return", value: `${result.total_return >= 0 ? "+" : ""}${result.total_return.toFixed(2)}%`, positive: result.total_return >= 0 },
                { label: "Ann. Return", value: `${result.annualized_return >= 0 ? "+" : ""}${result.annualized_return.toFixed(2)}%`, positive: result.annualized_return >= 0 },
                { label: "Sharpe Ratio", value: result.sharpe_ratio.toFixed(2), positive: result.sharpe_ratio >= 1 },
                { label: "Max Drawdown", value: `${result.max_drawdown.toFixed(2)}%`, positive: false },
                { label: "Win Rate", value: `${result.win_rate.toFixed(1)}%`, positive: result.win_rate >= 50 },
                { label: "Total Trades", value: result.total_trades.toString(), positive: undefined },
                { label: "Buy & Hold", value: `${result.buy_hold_return >= 0 ? "+" : ""}${result.buy_hold_return.toFixed(2)}%`, positive: result.buy_hold_return >= 0 },
                { label: "Alpha", value: `${result.alpha >= 0 ? "+" : ""}${result.alpha.toFixed(2)}%`, positive: result.alpha >= 0 },
              ].map(stat => (
                <div key={stat.label} className="bg-terminal-muted rounded-lg p-3">
                  <div className="text-[10px] font-mono text-terminal-dim uppercase tracking-widest mb-1">{stat.label}</div>
                  <div className={`text-lg font-mono font-bold ${stat.positive === undefined ? "text-terminal-text" : stat.positive ? "text-terminal-green" : "text-terminal-red"}`}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
            {result.total_return > result.buy_hold_return ? (
              <div className="mt-4 flex items-center gap-2 text-xs font-mono text-terminal-green bg-terminal-green/5 border border-terminal-green/20 rounded p-3">
                <TrendingUp className="w-4 h-4" />
                Strategy outperformed buy &amp; hold by {(result.total_return - result.buy_hold_return).toFixed(2)}%
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2 text-xs font-mono text-terminal-red bg-terminal-red/5 border border-terminal-red/20 rounded p-3">
                <TrendingDown className="w-4 h-4" />
                Strategy underperformed buy &amp; hold by {(result.buy_hold_return - result.total_return).toFixed(2)}%
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
