"use client";
import { useState } from "react";
import { Plus, X, RefreshCw, Star } from "lucide-react";
import toast from "react-hot-toast";
import { apiPost, apiDelete } from "@/lib/api";
import { invalidateApiCache, useApiCache } from "@/lib/use-api-cache";
import { formatPrice, colorForChange } from "@/lib/utils";
import Spinner from "@/components/ui/Spinner";

interface WatchItem {
  id: number;
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
  volume: string;
}

export default function WatchlistWidget() {
  const { data, loading, refreshing, reload } = useApiCache<WatchItem[]>(
    "watchlist",
    "/api/watchlist",
    { refreshInterval: 30_000 }
  );
  const items = data ?? [];
  const [adding, setAdding] = useState(false);
  const [newTicker, setNewTicker] = useState("");

  async function addTicker() {
    const sym = newTicker.trim().toUpperCase();
    if (!sym) return;
    try {
      const item = await apiPost<WatchItem>("/api/watchlist", { symbol: sym });
      invalidateApiCache("watchlist");
      reload(true);
      setNewTicker("");
      setAdding(false);
      toast.success(`${sym} added to watchlist`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add ticker");
    }
  }

  async function removeTicker(id: number, symbol: string) {
    try {
      await apiDelete(`/api/watchlist/${id}`);
      invalidateApiCache("watchlist");
      reload(true);
      toast.success(`${symbol} removed`);
    } catch {
      toast.error("Failed to remove");
    }
  }

  return (
    <div className="bg-terminal-surface border border-terminal-border rounded-lg p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-terminal-yellow" />
          <h2 className="text-xs font-mono text-terminal-dim uppercase tracking-widest">
            Watchlist
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => reload(true)}
            className="text-terminal-dim hover:text-terminal-text transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setAdding(!adding)}
            className="text-terminal-dim hover:text-terminal-accent transition-colors"
            title="Add ticker"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add ticker input */}
      {adding && (
        <div className="mb-3 flex gap-2 animate-slide-up">
          <input
            autoFocus
            type="text"
            value={newTicker}
            onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && addTicker()}
            placeholder="AAPL, BTC-USD..."
            maxLength={12}
            className="flex-1 bg-terminal-muted border border-terminal-border rounded px-3 py-1.5 text-sm font-mono text-terminal-text placeholder:text-terminal-dim/50 focus:outline-none focus:border-terminal-accent/50 uppercase"
          />
          <button
            onClick={addTicker}
            className="px-3 py-1.5 bg-terminal-accent/10 text-terminal-accent border border-terminal-accent/20 rounded text-xs font-mono hover:bg-terminal-accent/20 transition-colors"
          >
            Add
          </button>
        </div>
      )}

      {/* Table */}
      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center flex-1 py-8">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-8 text-center">
          <Star className="w-8 h-8 text-terminal-border mb-2" />
          <p className="text-sm text-terminal-dim">No tickers yet</p>
          <button
            onClick={() => setAdding(true)}
            className="mt-2 text-xs text-terminal-accent hover:underline"
          >
            Add your first ticker
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-terminal-border">
                <th className="text-left py-2 text-xs font-mono text-terminal-dim uppercase tracking-widest">Symbol</th>
                <th className="text-right py-2 text-xs font-mono text-terminal-dim uppercase tracking-widest">Price</th>
                <th className="text-right py-2 text-xs font-mono text-terminal-dim uppercase tracking-widest">Change</th>
                <th className="text-right py-2 text-xs font-mono text-terminal-dim uppercase tracking-widest">Volume</th>
                <th className="w-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terminal-border/50">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-terminal-muted/50 transition-colors group">
                  <td className="py-2.5 pr-2">
                    <div className="font-mono text-terminal-text font-medium">{item.symbol}</div>
                    <div className="text-xs text-terminal-dim truncate max-w-[120px]">{item.name}</div>
                  </td>
                  <td className="py-2.5 text-right font-mono text-terminal-text">
                    ${formatPrice(item.price)}
                  </td>
                  <td className={`py-2.5 text-right font-mono ${colorForChange(item.change_pct)}`}>
                    {item.change_pct >= 0 ? "+" : ""}{item.change_pct.toFixed(2)}%
                  </td>
                  <td className="py-2.5 text-right font-mono text-terminal-dim text-xs">
                    {item.volume}
                  </td>
                  <td className="py-2.5 pl-2">
                    <button
                      onClick={() => removeTicker(item.id, item.symbol)}
                      className="opacity-0 group-hover:opacity-100 text-terminal-dim hover:text-terminal-red transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
