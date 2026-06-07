"use client";
import { Newspaper, ExternalLink, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";
import { useApiCache } from "@/lib/use-api-cache";
import { useState } from "react";

interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  published_at: string;
  symbols: string[];
  sentiment: "positive" | "negative" | "neutral";
}

const FILTERS = ["All", "AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "META", "Crypto", "Economy"];

export default function NewsPage() {
  const [filter, setFilter] = useState("All");
  const path = `/api/market/news${filter !== "All" ? `?symbol=${filter}` : ""}`;
  const { data, loading, refreshing, reload } = useApiCache<NewsItem[]>(
    `market:news:${filter}`,
    path
  );
  const news = data ?? [];

  const sentimentIcon = (s: string) =>
    s === "positive" ? <TrendingUp className="w-3.5 h-3.5 text-terminal-green" /> :
    s === "negative" ? <TrendingDown className="w-3.5 h-3.5 text-terminal-red" /> :
    <Minus className="w-3.5 h-3.5 text-terminal-dim" />;

  const sentimentVariant = (s: string) =>
    s === "positive" ? "green" as const : s === "negative" ? "red" as const : "muted" as const;

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-terminal-accent" />
          <h1 className="text-lg font-semibold">Market News</h1>
        </div>
        <button onClick={() => reload(true)} className="text-terminal-dim hover:text-terminal-text transition-colors">
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors ${
              filter === f ? "border-terminal-accent/50 bg-terminal-accent/10 text-terminal-accent" : "border-terminal-border text-terminal-dim hover:text-terminal-text hover:border-terminal-accent/30"
            }`}>
            {f}
          </button>
        ))}
      </div>

      {loading && news.length === 0 ? (
        <div className="flex justify-center py-20"><Spinner size={32} /></div>
      ) : news.length === 0 ? (
        <div className="text-center py-20 text-terminal-dim">
          <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No news available for this symbol right now.</p>
        </div>
      ) : (
        <div className={`space-y-3 ${refreshing ? "opacity-90" : ""}`}>
          {news.map((item) => (
            <div key={item.id} className="bg-terminal-surface border border-terminal-border rounded-lg p-4 hover:border-terminal-accent/30 transition-colors group">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{sentimentIcon(item.sentiment)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="text-sm font-medium text-terminal-text leading-snug">{item.headline}</h3>
                    <a href={item.url} target="_blank" rel="noreferrer"
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <ExternalLink className="w-3.5 h-3.5 text-terminal-dim hover:text-terminal-accent" />
                    </a>
                  </div>
                  <p className="text-xs text-terminal-dim leading-relaxed mb-2 line-clamp-2">{item.summary}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={sentimentVariant(item.sentiment)}>{item.sentiment}</Badge>
                    <span className="text-[10px] text-terminal-dim font-mono">{item.source}</span>
                    <span className="text-[10px] text-terminal-dim font-mono">
                      {new Date(item.published_at).toLocaleString()}
                    </span>
                    {item.symbols.slice(0, 4).map((s) => (
                      <span key={s} className="text-[10px] font-mono text-terminal-accent bg-terminal-accent/10 px-1.5 py-0.5 rounded">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
