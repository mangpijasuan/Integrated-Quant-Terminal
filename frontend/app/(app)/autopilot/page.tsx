"use client";
import { useState } from "react";
import { Bot, Play, Square, AlertTriangle, Settings2, TrendingUp, Shield, Zap } from "lucide-react";
import toast from "react-hot-toast";

type AutopilotMode = "conservative" | "moderate" | "aggressive";
type AutopilotStatus = "stopped" | "running" | "paused";

interface AutopilotConfig {
  mode: AutopilotMode;
  max_position_size: number;
  max_daily_loss: number;
  universe: string[];
  use_ai_signals: boolean;
  use_algo_rules: boolean;
  rebalance_daily: boolean;
}

const MODE_CONFIG = {
  conservative: {
    label: "Conservative",
    desc: "Low-risk, focus on large-cap value stocks. Strict loss limits.",
    color: "text-terminal-green",
    bg: "bg-terminal-green/10",
    border: "border-terminal-green/30",
    icon: Shield,
  },
  moderate: {
    label: "Moderate",
    desc: "Balanced approach mixing momentum and value strategies.",
    color: "text-terminal-accent",
    bg: "bg-terminal-accent/10",
    border: "border-terminal-accent/30",
    icon: TrendingUp,
  },
  aggressive: {
    label: "Aggressive",
    desc: "High-conviction momentum trades. Higher risk, higher reward potential.",
    color: "text-terminal-orange",
    bg: "bg-terminal-orange/10",
    border: "border-terminal-orange/30",
    icon: Zap,
  },
};

const SAMPLE_UNIVERSE = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "JPM", "V", "UNH"];

export default function AutopilotPage() {
  const [status, setStatus] = useState<AutopilotStatus>("stopped");
  const [config, setConfig] = useState<AutopilotConfig>({
    mode: "moderate",
    max_position_size: 5,
    max_daily_loss: 2,
    universe: SAMPLE_UNIVERSE.slice(0, 5),
    use_ai_signals: true,
    use_algo_rules: true,
    rebalance_daily: true,
  });
  const [newSym, setNewSym] = useState("");
  const [logs] = useState([
    { time: "09:31:04", msg: "Market opened. Scanning universe...", type: "info" },
    { time: "09:31:12", msg: "AI signal: AAPL — bullish, RSI 38, earnings beat likely", type: "signal" },
    { time: "09:31:15", msg: "Position sizing: AAPL 3.2% of portfolio", type: "trade" },
    { time: "09:31:16", msg: "Order submitted: BUY 12 AAPL @ market", type: "trade" },
  ]);

  function togglePilot() {
    if (status === "stopped") {
      setStatus("running");
      toast.success("Autopilot started — monitoring market");
    } else {
      setStatus("stopped");
      toast("Autopilot stopped", { icon: "⏹" });
    }
  }

  function addSym() {
    const s = newSym.trim().toUpperCase();
    if (s && !config.universe.includes(s)) {
      setConfig(p => ({ ...p, universe: [...p.universe, s] }));
    }
    setNewSym("");
  }

  function removeSym(sym: string) {
    setConfig(p => ({ ...p, universe: p.universe.filter(s => s !== sym) }));
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-terminal-green" />
          <h1 className="text-lg font-semibold">Autopilot</h1>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${status === "running" ? "bg-terminal-green/10 text-terminal-green animate-pulse" : "bg-terminal-muted text-terminal-dim"}`}>
            {status === "running" ? "● RUNNING" : "○ STOPPED"}
          </span>
        </div>
        <button
          onClick={togglePilot}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-all ${
            status === "running"
              ? "bg-terminal-red/10 border border-terminal-red/20 text-terminal-red hover:bg-terminal-red/20"
              : "bg-terminal-green/10 border border-terminal-green/20 text-terminal-green hover:bg-terminal-green/20"
          }`}>
          {status === "running" ? <><Square className="w-4 h-4" />Stop</> : <><Play className="w-4 h-4" />Start Autopilot</>}
        </button>
      </div>

      {/* Warning */}
      <div className="bg-terminal-yellow/5 border border-terminal-yellow/20 rounded-lg p-3 flex items-start gap-2 text-xs text-terminal-dim font-mono">
        <AlertTriangle className="w-4 h-4 text-terminal-yellow flex-shrink-0 mt-0.5" />
        Autopilot executes trades on your IBKR account via IB Gateway. Always test thoroughly on paper before using live funds.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Config */}
        <div className="lg:col-span-2 space-y-4">
          {/* Risk mode */}
          <div className="bg-terminal-surface border border-terminal-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings2 className="w-4 h-4 text-terminal-dim" />
              <h2 className="text-xs font-mono text-terminal-dim uppercase tracking-widest">Risk Profile</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(Object.entries(MODE_CONFIG) as [AutopilotMode, typeof MODE_CONFIG.conservative][]).map(([key, mc]) => (
                <button key={key} onClick={() => setConfig(p => ({ ...p, mode: key }))}
                  className={`p-3 rounded-lg border text-left transition-all ${config.mode === key ? `${mc.bg} ${mc.border}` : "border-terminal-border hover:border-terminal-border/70"}`}>
                  <mc.icon className={`w-4 h-4 mb-1.5 ${mc.color}`} />
                  <div className={`text-xs font-semibold ${mc.color}`}>{mc.label}</div>
                  <div className="text-[10px] text-terminal-dim mt-0.5 leading-relaxed">{mc.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Risk limits */}
          <div className="bg-terminal-surface border border-terminal-border rounded-lg p-4">
            <h2 className="text-xs font-mono text-terminal-dim uppercase tracking-widest mb-3">Risk Limits</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono text-terminal-dim uppercase tracking-widest mb-1">Max Position Size (%)</label>
                <input type="number" value={config.max_position_size} onChange={e => setConfig(p => ({ ...p, max_position_size: Number(e.target.value) }))} min={1} max={20}
                  className="w-full bg-terminal-muted border border-terminal-border rounded px-3 py-2 text-sm font-mono text-terminal-text focus:outline-none focus:border-terminal-accent/50" />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-terminal-dim uppercase tracking-widest mb-1">Max Daily Loss (%)</label>
                <input type="number" value={config.max_daily_loss} onChange={e => setConfig(p => ({ ...p, max_daily_loss: Number(e.target.value) }))} min={0.5} max={10}
                  className="w-full bg-terminal-muted border border-terminal-border rounded px-3 py-2 text-sm font-mono text-terminal-text focus:outline-none focus:border-terminal-accent/50" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              {[
                { key: "use_ai_signals", label: "AI Signals" },
                { key: "use_algo_rules", label: "Algo Rules" },
                { key: "rebalance_daily", label: "Daily Rebalance" },
              ].map(opt => (
                <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={config[opt.key as keyof AutopilotConfig] as boolean}
                    onChange={e => setConfig(p => ({ ...p, [opt.key]: e.target.checked }))}
                    className="w-4 h-4 rounded border-terminal-border accent-terminal-accent" />
                  <span className="text-xs font-mono text-terminal-dim">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Universe */}
          <div className="bg-terminal-surface border border-terminal-border rounded-lg p-4">
            <h2 className="text-xs font-mono text-terminal-dim uppercase tracking-widest mb-3">Trading Universe</h2>
            <div className="flex gap-2 mb-3">
              <input value={newSym} onChange={e => setNewSym(e.target.value.toUpperCase())} onKeyDown={e => e.key === "Enter" && addSym()} placeholder="Add symbol..."
                className="flex-1 bg-terminal-muted border border-terminal-border rounded px-3 py-1.5 text-sm font-mono text-terminal-text focus:outline-none focus:border-terminal-accent/50" />
              <button onClick={addSym} className="px-3 py-1.5 bg-terminal-accent/10 border border-terminal-accent/20 text-terminal-accent rounded text-xs font-mono hover:bg-terminal-accent/20 transition-colors">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.universe.map(sym => (
                <div key={sym} className="flex items-center gap-1.5 bg-terminal-muted border border-terminal-border rounded px-2.5 py-1">
                  <span className="text-xs font-mono text-terminal-text">{sym}</span>
                  <button onClick={() => removeSym(sym)} className="text-terminal-dim hover:text-terminal-red transition-colors">×</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity log */}
        <div className="bg-terminal-surface border border-terminal-border rounded-lg p-4 flex flex-col">
          <h2 className="text-xs font-mono text-terminal-dim uppercase tracking-widest mb-3">Activity Log</h2>
          <div className="flex-1 space-y-1.5 overflow-y-auto max-h-80">
            {status === "stopped" ? (
              <div className="text-center py-8 text-terminal-dim text-xs font-mono">Start autopilot to see activity</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="flex gap-2 text-[10px] font-mono">
                  <span className="text-terminal-dim flex-shrink-0">{log.time}</span>
                  <span className={log.type === "trade" ? "text-terminal-green" : log.type === "signal" ? "text-terminal-accent" : "text-terminal-dim"}>
                    {log.msg}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
