"use client";
import { RefreshCw, TrendingUp, TrendingDown, LineChart } from "lucide-react";
import { colorForChange, formatPrice } from "@/shared/utils";
import Spinner from "@/components/ui/Spinner";
import { useApiCache } from "@/shared/use-api-cache";

interface Quote {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
  change_abs: number;
  volume: string;
  high: number;
  low: number;
  open: number;
}

const SECTIONS = [
  { label: "Major Indices", symbols: ["SPY", "QQQ", "DIA", "IWM", "VIX"] },
  { label: "Tech Giants", symbols: ["AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN", "TSLA"] },
  { label: "Crypto", symbols: ["BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD"] },
  { label: "Commodities & FX", symbols: ["GLD", "SLV", "USO", "UUP"] },
];

const ALL_SYMBOLS = SECTIONS.flatMap((s) => s.symbols);

export default function MarketsPage() {
  const { data, loading, refreshing, reload } = useApiCache<Record<string, Quote>>(
    `market:quotes:${ALL_SYMBOLS.join(",")}`,
    `/api/market/quotes?symbols=${ALL_SYMBOLS.join(",")}`
  );
  const quotes = data ?? {};

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LineChart className="w-5 h-5 text-terminal-accent" />
          <h1 className="text-lg font-semibold">Markets</h1>
        </div>
        <button
          onClick={() => reload(true)}
          className="text-terminal-dim hover:text-terminal-text transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && Object.keys(quotes).length === 0 ? (
        <div className="flex justify-center py-20"><Spinner size={32} /></div>
      ) : (
        <div className={`space-y-6 ${refreshing ? "opacity-90" : ""}`}>
          {SECTIONS.map((section) => (
            <div key={section.label}>
              <h2 className="text-xs font-mono text-terminal-dim uppercase tracking-widest mb-3">{section.label}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {section.symbols.map((sym) => {
                  const q = quotes[sym];
                  return (
                    <div key={sym} className="bg-terminal-surface border border-terminal-border rounded-lg p-4 hover:border-terminal-accent/30 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-mono text-sm font-semibold text-terminal-text">{sym}</div>
                          {q && <div className="text-[10px] text-terminal-dim truncate max-w-[120px]">{q.name}</div>}
                        </div>
                        {q && (
                          q.change_pct >= 0
                            ? <TrendingUp className="w-4 h-4 text-terminal-green" />
                            : <TrendingDown className="w-4 h-4 text-terminal-red" />
                        )}
                      </div>
                      {q ? (
                        <>
                          <div className="font-mono text-lg font-bold text-terminal-text">${formatPrice(q.price ?? 0)}</div>
                          <div className={`font-mono text-xs mt-0.5 ${colorForChange(q.change_pct)}`}>
                            {(q.change_pct ?? 0) >= 0 ? "+" : ""}{(q.change_pct ?? 0).toFixed(2)}%
                            <span className="ml-1 text-terminal-dim">
                              ({(q.change_abs ?? 0) >= 0 ? "+" : ""}{(q.change_abs ?? 0).toFixed(2)})
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] font-mono text-terminal-dim">
                            <div><span className="opacity-60">O</span> {formatPrice(q.open ?? 0)}</div>
                            <div><span className="opacity-60">H</span> {formatPrice(q.high ?? 0)}</div>
                            <div><span className="opacity-60">L</span> {formatPrice(q.low ?? 0)}</div>
                          </div>
                        </>
                      ) : (
                        <div className="text-terminal-dim text-xs font-mono mt-2">—</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
