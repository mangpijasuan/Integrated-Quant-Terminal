"use client";
import { Star } from "lucide-react";
import WatchlistWidget from "@/components/watchlist/WatchlistWidget";

export default function WatchlistPage() {
  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center gap-2">
        <Star className="w-5 h-5 text-terminal-yellow" />
        <h1 className="text-lg font-semibold">Watchlist</h1>
      </div>
      <div className="max-w-3xl">
        <WatchlistWidget />
      </div>
    </div>
  );
}
