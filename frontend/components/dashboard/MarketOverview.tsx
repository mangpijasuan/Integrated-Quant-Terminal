"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatPrice, formatChange, colorForChange } from "@/shared/utils";
import Spinner from "@/components/ui/Spinner";
import { useApiCache } from "@/shared/use-api-cache";

interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
  change_abs: number;
  source?: string;
}

const ICONS: Record<string, string> = {
  "^GSPC": "🇺🇸",
  "^DJI": "🏭",
  "^IXIC": "💻",
  "^RUT": "📦",
  "BTC-USD": "₿",
  "ETH-USD": "Ξ",
  "GC=F": "🥇",
  "CL=F": "🛢️",
};

export default function MarketOverview() {
  const { data, loading, refreshing } = useApiCache<MarketItem[]>(
    "market:overview",
    "/api/market/overview",
    { refreshInterval: 30_000 }
  );
  const items = data ?? [];
  const sources = new Set(items.map((item) => item.source ?? "public"));
  const showBadge = sources.size > 1 || !sources.has("ibkr");
  const badgeLabel = sources.has("ibkr") && sources.size > 1 ? "Mixed sources" : "Fallback data";

  if (loading && items.length === 0) {
    return (
      <div className="bg-terminal-surface border border-terminal-border rounded-lg p-5">
        <h2 className="text-xs font-mono text-terminal-dim uppercase tracking-widest mb-4">
          Market Overview
        </h2>
        <div className="flex items-center justify-center h-32">
          <Spinner size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-terminal-surface border border-terminal-border rounded-lg p-5 ${refreshing ? "opacity-90" : ""}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-mono text-terminal-dim uppercase tracking-widest">
          Market Overview
        </h2>
        {showBadge && (
          <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-full border border-terminal-border bg-terminal-muted text-terminal-dim">
            {badgeLabel}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((item) => {
          const up = item.change_pct > 0;
          const down = item.change_pct < 0;
          return (
            <div
              key={item.symbol}
              className="bg-terminal-muted border border-terminal-border rounded p-3 hover:border-terminal-accent/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg leading-none">{ICONS[item.symbol] || "📈"}</span>
                {up ? (
                  <TrendingUp className="w-3.5 h-3.5 text-terminal-green" />
                ) : down ? (
                  <TrendingDown className="w-3.5 h-3.5 text-terminal-red" />
                ) : (
                  <Minus className="w-3.5 h-3.5 text-terminal-dim" />
                )}
              </div>
              <div className="text-xs font-mono text-terminal-dim mb-0.5">{item.symbol}</div>
              <div className="text-sm font-mono text-terminal-text font-medium">
                ${formatPrice(item.price)}
              </div>
              <div className={`text-xs font-mono mt-0.5 ${colorForChange(item.change_pct)}`}>
                {formatChange(item.change_pct)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
