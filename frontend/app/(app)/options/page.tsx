"use client";
import { useState } from "react";
import { Layers, Search, Zap } from "lucide-react";
import { apiGet, apiPost } from "@/shared/api";
import Spinner from "@/components/ui/Spinner";
import toast from "react-hot-toast";

interface OptionContract {
  strike: number;
  expiry: string;
  type: "call" | "put";
  last: number;
  bid: number;
  ask: number;
  volume: number;
  open_interest: number;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  in_the_money: boolean;
}

interface OptionsChain {
  symbol: string;
  current_price: number;
  expiries: string[];
  calls: OptionContract[];
  puts: OptionContract[];
}

interface AIStrategy {
  strategy: string;
  rationale: string;
  legs: { type: string; strike: number; expiry: string; action: string; qty?: number }[];
  max_profit: string;
  max_loss: string;
  breakeven: string;
}

export default function OptionsPage() {
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [chain, setChain] = useState<OptionsChain | null>(null);
  const [selectedExpiry, setSelectedExpiry] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [aiStrategy, setAiStrategy] = useState<AIStrategy | null>(null);
  const [view, setView] = useState<"calls" | "puts" | "both">("both");

  async function loadChain(sym?: string, expiry?: string) {
    const symbol = (sym || ticker).trim().toUpperCase();
    if (!symbol) return;
    setTicker(symbol);
    setLoading(true);
    if (!expiry) {
      setChain(null);
      setAiStrategy(null);
    }
    try {
      const q = expiry ? `?expiry=${encodeURIComponent(expiry)}` : "";
      const data = await apiGet<OptionsChain>(`/api/options/chain/${symbol}${q}`);
      setChain(data);
      if (!expiry) setSelectedExpiry(data.expiries[0] ?? "");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load options chain");
    } finally {
      setLoading(false);
    }
  }

  async function executeStrategy() {
    if (!chain || !aiStrategy?.legs.length) return;
    if (!confirm(`Send ${aiStrategy.legs.length} option leg(s) to IBKR?`)) return;
    setExecuting(true);
    try {
      await apiPost("/api/options/strategy/execute", {
        symbol: chain.symbol,
        legs: aiStrategy.legs,
      });
      toast.success("Strategy legs submitted to IBKR");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Execution failed");
    } finally {
      setExecuting(false);
    }
  }

  async function executeLeg(leg: AIStrategy["legs"][0]) {
    if (!chain) return;
    setExecuting(true);
    try {
      await apiPost("/api/options/orders", {
        symbol: chain.symbol,
        strike: leg.strike,
        expiry: leg.expiry,
        type: leg.type,
        side: leg.action.toLowerCase(),
        qty: leg.qty ?? 1,
        order_type: "market",
      });
      toast.success(`IBKR order submitted: ${leg.action} ${leg.type} ${leg.strike}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Order failed");
    } finally {
      setExecuting(false);
    }
  }

  async function getAIStrategy() {
    if (!chain) return;
    setAiLoading(true);
    try {
      const data = await apiPost<AIStrategy>("/api/options/strategy", {
        symbol: chain.symbol,
        current_price: chain.current_price,
        expiry: selectedExpiry,
      });
      setAiStrategy(data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "AI strategy failed");
    } finally {
      setAiLoading(false);
    }
  }

  const filteredContracts = chain ? [
    ...(view !== "puts" ? chain.calls.filter(c => c.expiry === selectedExpiry).map(c => ({ ...c, type: "call" as const })) : []),
    ...(view !== "calls" ? chain.puts.filter(c => c.expiry === selectedExpiry).map(c => ({ ...c, type: "put" as const })) : []),
  ].sort((a, b) => a.strike - b.strike) : [];

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center gap-2">
        <Layers className="w-5 h-5 text-terminal-accent" />
        <h1 className="text-lg font-semibold">Options</h1>
        <span className="text-xs font-mono text-terminal-dim border border-terminal-border rounded px-2 py-0.5">IBKR</span>
      </div>

      {/* Search */}
      <div className="bg-terminal-surface border border-terminal-border rounded-lg p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-terminal-dim" />
            <input
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && loadChain()}
              placeholder="Enter stock ticker (AAPL, TSLA...)"
              className="w-full bg-terminal-muted border border-terminal-border rounded-lg pl-10 pr-4 py-2.5 text-sm font-mono text-terminal-text placeholder:text-terminal-dim/50 focus:outline-none focus:border-terminal-accent/50"
            />
          </div>
          <button onClick={() => loadChain()} disabled={loading || !ticker} className="px-5 py-2.5 bg-terminal-accent text-terminal-bg font-semibold rounded-lg text-sm hover:bg-terminal-accent/90 disabled:opacity-50 flex items-center gap-2">
            {loading ? <Spinner size={14} /> : <Search className="w-4 h-4" />}
            Load Chain
          </button>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          {["AAPL", "TSLA", "NVDA", "SPY", "QQQ"].map(s => (
            <button key={s} onClick={() => loadChain(s)} className="text-xs font-mono px-2.5 py-1 bg-terminal-muted border border-terminal-border rounded hover:border-terminal-accent/40 text-terminal-dim hover:text-terminal-accent transition-colors">
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="flex justify-center py-16"><Spinner size={32} /></div>}

      {chain && (
        <>
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <span className="text-xs font-mono text-terminal-dim mr-2">Expiry:</span>
              <select
                value={selectedExpiry}
                onChange={e => {
                  const exp = e.target.value;
                  setSelectedExpiry(exp);
                  if (chain) loadChain(chain.symbol, exp);
                }}
                className="bg-terminal-muted border border-terminal-border rounded px-3 py-1.5 text-xs font-mono text-terminal-text focus:outline-none focus:border-terminal-accent/50"
              >
                {chain.expiries.map(exp => <option key={exp} value={exp}>{exp}</option>)}
              </select>
            </div>
            <div className="flex gap-1">
              {(["calls", "puts", "both"] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors ${view === v ? "border-terminal-accent/50 bg-terminal-accent/10 text-terminal-accent" : "border-terminal-border text-terminal-dim hover:text-terminal-text"}`}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            <div className="ml-auto font-mono text-sm text-terminal-dim">
              {chain.symbol} @ <span className="text-terminal-text font-semibold">${chain.current_price.toFixed(2)}</span>
            </div>
            <button onClick={getAIStrategy} disabled={aiLoading} className="flex items-center gap-2 px-4 py-1.5 bg-terminal-accent/10 border border-terminal-accent/20 text-terminal-accent rounded text-xs font-mono hover:bg-terminal-accent/20 transition-colors disabled:opacity-50">
              {aiLoading ? <Spinner size={12} /> : <Zap className="w-3.5 h-3.5" />}
              AI Strategy
            </button>
          </div>

          {/* AI Strategy */}
          {aiStrategy && (
            <div className="bg-terminal-surface border border-terminal-accent/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-terminal-accent" />
                <h3 className="text-sm font-semibold text-terminal-accent">{aiStrategy.strategy}</h3>
              </div>
              <p className="text-xs text-terminal-dim mb-3 leading-relaxed">{aiStrategy.rationale}</p>
              <div className="grid grid-cols-3 gap-3 text-xs font-mono mb-3">
                <div><span className="text-terminal-dim">Max Profit: </span><span className="text-terminal-green">{aiStrategy.max_profit}</span></div>
                <div><span className="text-terminal-dim">Max Loss: </span><span className="text-terminal-red">{aiStrategy.max_loss}</span></div>
                <div><span className="text-terminal-dim">Breakeven: </span><span className="text-terminal-text">{aiStrategy.breakeven}</span></div>
              </div>
              {aiStrategy.legs.length > 0 && (
                <div className="space-y-1">
                  {aiStrategy.legs.map((leg, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs font-mono">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${leg.action === "Buy" ? "bg-terminal-green/10 text-terminal-green" : "bg-terminal-red/10 text-terminal-red"}`}>{leg.action}</span>
                      <span className="text-terminal-text">${leg.strike} {leg.type} {leg.expiry}</span>
                      <button onClick={() => executeLeg(leg)} disabled={executing}
                        className="ml-auto px-2 py-0.5 border border-terminal-accent/30 text-terminal-accent rounded text-[10px] hover:bg-terminal-accent/10 disabled:opacity-50">
                        Execute
                      </button>
                    </div>
                  ))}
                  <button onClick={executeStrategy} disabled={executing}
                    className="mt-3 flex items-center gap-2 px-4 py-1.5 bg-terminal-accent text-terminal-bg rounded text-xs font-mono font-semibold hover:bg-terminal-accent/90 disabled:opacity-50">
                    {executing ? <Spinner size={12} /> : null}
                    Execute All on IBKR
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Chain table */}
          <div className="bg-terminal-surface border border-terminal-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-terminal-border bg-terminal-muted/30">
                    {["Type", "Strike", "Bid", "Ask", "Last", "IV", "Delta", "Gamma", "Theta", "Volume", "OI"].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] text-terminal-dim uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-terminal-border/30">
                  {filteredContracts.map((c, i) => (
                    <tr key={i} className={`hover:bg-terminal-muted/30 transition-colors ${c.in_the_money ? "bg-terminal-accent/3" : ""}`}>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${c.type === "call" ? "bg-terminal-green/10 text-terminal-green" : "bg-terminal-red/10 text-terminal-red"}`}>
                          {c.type.toUpperCase()}
                        </span>
                      </td>
                      <td className={`px-3 py-2 font-semibold ${c.in_the_money ? "text-terminal-accent" : "text-terminal-text"}`}>${c.strike}</td>
                      <td className="px-3 py-2 text-terminal-dim">${c.bid?.toFixed(2) ?? "—"}</td>
                      <td className="px-3 py-2 text-terminal-dim">${c.ask?.toFixed(2) ?? "—"}</td>
                      <td className="px-3 py-2 text-terminal-text">${c.last?.toFixed(2) ?? "—"}</td>
                      <td className="px-3 py-2 text-terminal-text">{c.iv ? (c.iv * 100).toFixed(1) + "%" : "—"}</td>
                      <td className="px-3 py-2 text-terminal-text">{c.delta?.toFixed(3) ?? "—"}</td>
                      <td className="px-3 py-2 text-terminal-dim">{c.gamma?.toFixed(4) ?? "—"}</td>
                      <td className="px-3 py-2 text-terminal-red">{c.theta?.toFixed(3) ?? "—"}</td>
                      <td className="px-3 py-2 text-terminal-dim">{c.volume?.toLocaleString() ?? "—"}</td>
                      <td className="px-3 py-2 text-terminal-dim">{c.open_interest?.toLocaleString() ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && !chain && (
        <div className="text-center py-20 text-terminal-dim">
          <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Enter a ticker to load the options chain</p>
        </div>
      )}
    </div>
  );
}
