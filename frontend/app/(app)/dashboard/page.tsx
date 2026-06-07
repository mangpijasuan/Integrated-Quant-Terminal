import MarketOverview from "@/components/dashboard/MarketOverview";
import WatchlistWidget from "@/components/watchlist/WatchlistWidget";
import TopMovers from "@/components/dashboard/TopMovers";
import MarketMood from "@/components/dashboard/MarketMood";
import Link from "next/link";
import { Brain, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-terminal-text">Dashboard</h1>
          <p className="text-sm text-terminal-dim">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        {/* AI Analyst CTA */}
        <Link
          href="/analyst"
          className="flex items-center gap-2.5 bg-terminal-accent/10 border border-terminal-accent/20 text-terminal-accent px-4 py-2 rounded hover:bg-terminal-accent/20 transition-colors text-sm font-medium"
        >
          <Brain className="w-4 h-4" />
          AI Stock Analyst
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Market overview — full width */}
      <MarketOverview />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Watchlist — 2 cols */}
        <div className="lg:col-span-2">
          <WatchlistWidget />
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <MarketMood />
          <TopMovers />
        </div>
      </div>
    </div>
  );
}
