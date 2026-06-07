"use client";
import { Flame, TrendingUp, TrendingDown } from "lucide-react";
import { colorForChange } from "@/lib/utils";
import Spinner from "@/components/ui/Spinner";
import { useApiCache } from "@/lib/use-api-cache";
import { useState } from "react";

interface Mover {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
  source?: string;
}

export default function TopMovers() {
  const { data, loading } = useApiCache<{ gainers: Mover[]; losers: Mover[] }>(
    "market:movers",
    "/api/market/movers"
  );
  const gainers = data?.gainers ?? [];
  const losers = data?.losers ?? [];
  const [tab, setTab] = useState<"gainers" | "losers">("gainers");
  const activeItems = tab === "gainers" ? gainers : losers;
  const hasFallback = [...gainers, ...losers].some((item) => item.source && item.source !== "ibkr");

  return (
    <div className="bg-terminal-surface border border-terminal-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-terminal-orange" />
          <h2 className="text-xs font-mono text-terminal-dim uppercase tracking-widest">
            Top Movers
          </h2>
          {hasFallback && (
            <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-full border border-terminal-border bg-terminal-muted text-terminal-dim">
              Fallback data
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {(["gainers", "losers"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                tab === t
                  ? t === "gainers"
                    ? "bg-terminal-green/10 text-terminal-green"
                    : "bg-terminal-red/10 text-terminal-red"
                  : "text-terminal-dim hover:text-terminal-text"
              }`}
            >
              {t === "gainers" ? "▲" : "▼"} {t}
            </button>
          ))}
        </div>
      </div>

      {loading && activeItems.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-2">
          {activeItems.map((m) => (
            <div
              key={m.symbol}
              className="flex items-center gap-3 py-1.5 hover:bg-terminal-muted/50 px-2 rounded transition-colors"
            >
              {tab === "gainers" ? (
                <TrendingUp className="w-3.5 h-3.5 text-terminal-green flex-shrink-0" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-terminal-red flex-shrink-0" />
              )}
              <span className="font-mono text-sm font-semibold text-terminal-text w-14">{m.symbol}</span>
              <span className="font-mono text-sm text-terminal-text flex-1">${m.price.toFixed(2)}</span>
              <span className={`font-mono text-xs ${colorForChange(m.change_pct)}`}>
                {m.change_pct >= 0 ? "+" : ""}{m.change_pct.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
