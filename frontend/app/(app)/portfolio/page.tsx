"use client";
import { useEffect, useState, useCallback } from "react";
import { PieChart, RefreshCw, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { apiGet, apiDelete } from "@/shared/api";
import { colorForChange } from "@/shared/utils";
import Spinner from "@/components/ui/Spinner";
import toast from "react-hot-toast";
import { fetchCached, invalidateApiCache } from "@/shared/use-api-cache";

interface Account {
  equity: number;
  cash: number;
  portfolio_value: number;
  buying_power: number;
  day_pl: number;
  day_pl_pct: number;
  unrealized_pl: number;
  unrealized_plpc: number;
}

interface Position {
  symbol: string;
  qty: number;
  avg_entry_price: number;
  current_price: number;
  market_value: number;
  unrealized_pl: number;
  unrealized_plpc: number;
  side: string;
}

function StatCard({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="bg-terminal-surface border border-terminal-border rounded-lg p-4">
      <div className="text-[10px] font-mono text-terminal-dim uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-xl font-mono font-bold ${positive === undefined ? "text-terminal-text" : positive ? "text-terminal-green" : "text-terminal-red"}`}>
        {value}
      </div>
      {sub && <div className="text-xs font-mono text-terminal-dim mt-0.5">{sub}</div>}
    </div>
  );
}

export default function PortfolioPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [brokerError, setBrokerError] = useState<string | null>(null);

  const load = useCallback(async (background = false) => {
    setBrokerError(null);
    if (background) setRefreshing(true);
    else setLoading(true);

    try {
      const [acc, pos] = await Promise.all([
        fetchCached("trading:account", () => apiGet<Account>("/api/trading/account"), 30_000),
        fetchCached("trading:positions", () => apiGet<Position[]>("/api/trading/positions"), 30_000),
      ]);
      setAccount(acc);
      setPositions(pos);
    } catch (e: unknown) {
      if (!background) {
        setAccount(null);
        setPositions([]);
      }
      setBrokerError(e instanceof Error ? e.message : "Could not connect to IBKR");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function closePosition(symbol: string) {
    if (!confirm(`Close entire ${symbol} position?`)) return;
    try {
      await apiDelete(`/api/trading/positions/${symbol}`);
      toast.success(`${symbol} position closed`);
      invalidateApiCache("trading:account");
      invalidateApiCache("trading:positions");
      load(true);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to close position");
    }
  }

  const fmt = (n: number) => n?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "—";

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PieChart className="w-5 h-5 text-terminal-accent" />
          <h1 className="text-lg font-semibold">Portfolio</h1>
          <span className="text-xs font-mono text-terminal-dim border border-terminal-border rounded px-2 py-0.5">IBKR</span>
        </div>
        <button onClick={() => load(true)} className="text-terminal-dim hover:text-terminal-text transition-colors">
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && !account ? (
        <div className="flex justify-center py-20"><Spinner size={32} /></div>
      ) : !account ? (
        <div className="text-center py-20 text-terminal-dim">
          <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="mb-2">Could not load IBKR portfolio.</p>
          {brokerError && (
            <p className="text-xs font-mono text-terminal-red mb-3 max-w-md mx-auto">{brokerError}</p>
          )}
          <p className="text-xs">Ensure IB Gateway is running on port 4002, then go to Settings → Broker → Test Connection.</p>
        </div>
      ) : (
        <>
          {/* Account summary */}
          <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 ${refreshing ? "opacity-90" : ""}`}>
            <StatCard label="Portfolio Value" value={`$${fmt(account.portfolio_value)}`} />
            <StatCard label="Cash" value={`$${fmt(account.cash)}`} />
            <StatCard label="Day P&L" value={`${account.day_pl >= 0 ? "+" : ""}$${fmt(account.day_pl)}`} sub={`${account.day_pl_pct >= 0 ? "+" : ""}${account.day_pl_pct?.toFixed(2) ?? "—"}%`} positive={account.day_pl >= 0} />
            <StatCard label="Total Unrealized P&L" value={`${account.unrealized_pl >= 0 ? "+" : ""}$${fmt(account.unrealized_pl)}`} sub={`${account.unrealized_plpc >= 0 ? "+" : ""}${account.unrealized_plpc?.toFixed(2) ?? "—"}%`} positive={account.unrealized_pl >= 0} />
          </div>

          {/* Positions table */}
          <div className="bg-terminal-surface border border-terminal-border rounded-lg">
            <div className="px-5 py-3 border-b border-terminal-border flex items-center justify-between">
              <h2 className="text-xs font-mono text-terminal-dim uppercase tracking-widest">Open Positions</h2>
              <span className="text-xs font-mono text-terminal-dim">{positions.length} positions</span>
            </div>
            {positions.length === 0 ? (
              <div className="text-center py-12 text-terminal-dim text-sm">No open positions</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-terminal-border/50">
                      {["Symbol", "Qty", "Avg Cost", "Current", "Market Value", "P&L", "P&L %", ""].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-mono text-terminal-dim uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-terminal-border/30">
                    {positions.map(p => (
                      <tr key={p.symbol} className="hover:bg-terminal-muted/30 transition-colors group">
                        <td className="px-4 py-3 font-mono font-semibold text-terminal-text">{p.symbol}</td>
                        <td className="px-4 py-3 font-mono text-terminal-text">{p.qty}</td>
                        <td className="px-4 py-3 font-mono text-terminal-dim">${fmt(p.avg_entry_price)}</td>
                        <td className="px-4 py-3 font-mono text-terminal-text">${fmt(p.current_price)}</td>
                        <td className="px-4 py-3 font-mono text-terminal-text">${fmt(p.market_value)}</td>
                        <td className={`px-4 py-3 font-mono ${colorForChange(p.unrealized_pl)}`}>{p.unrealized_pl >= 0 ? "+" : ""}${fmt(p.unrealized_pl)}</td>
                        <td className={`px-4 py-3 font-mono ${colorForChange(p.unrealized_plpc)}`}>{p.unrealized_plpc >= 0 ? "+" : ""}{(p.unrealized_plpc * 100).toFixed(2)}%</td>
                        <td className="px-4 py-3">
                          <button onClick={() => closePosition(p.symbol)} className="opacity-0 group-hover:opacity-100 text-[10px] font-mono text-terminal-red/70 hover:text-terminal-red border border-terminal-red/20 hover:border-terminal-red/50 px-2 py-0.5 rounded transition-all">
                            Close
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
