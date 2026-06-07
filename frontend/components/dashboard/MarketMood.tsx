"use client";
import { Activity } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import { useApiCache } from "@/shared/use-api-cache";

interface MoodData {
  score: number;
  label: string;
  vix: number;
  sp500_trend: string;
  description: string;
  source?: string;
}

function moodColor(score: number) {
  if (score >= 75) return { bar: "bg-terminal-red", text: "text-terminal-red" };
  if (score >= 55) return { bar: "bg-terminal-orange", text: "text-terminal-orange" };
  if (score >= 45) return { bar: "bg-terminal-yellow", text: "text-terminal-yellow" };
  if (score >= 25) return { bar: "bg-terminal-green/60", text: "text-terminal-green/80" };
  return { bar: "bg-terminal-green", text: "text-terminal-green" };
}

export default function MarketMood() {
  const { data: mood, loading } = useApiCache<MoodData>("market:mood", "/api/market/mood");
  const colors = mood ? moodColor(mood.score) : { bar: "bg-terminal-dim", text: "text-terminal-dim" };

  return (
    <div className="bg-terminal-surface border border-terminal-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-terminal-accent" />
          <h2 className="text-xs font-mono text-terminal-dim uppercase tracking-widest">
            Market Mood
          </h2>
        </div>
        {mood?.source && mood.source !== "ibkr" && (
          <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-full border border-terminal-border bg-terminal-muted text-terminal-dim">
            Fallback data
          </span>
        )}
      </div>

      {loading && !mood ? (
        <div className="flex items-center justify-center h-24">
          <Spinner />
        </div>
      ) : mood ? (
        <div>
          <div className="flex items-end justify-between mb-2">
            <span className={`text-2xl font-mono font-bold ${colors.text}`}>
              {mood.score}
            </span>
            <span className={`text-xs font-mono uppercase tracking-widest ${colors.text}`}>
              {mood.label}
            </span>
          </div>
          <div className="h-1.5 bg-terminal-muted rounded-full overflow-hidden mb-3">
            <div className={`h-full ${colors.bar} transition-all`} style={{ width: `${mood.score}%` }} />
          </div>
          <p className="text-xs text-terminal-dim leading-relaxed mb-2">{mood.description}</p>
          <div className="flex gap-4 text-[10px] font-mono text-terminal-dim">
            <span>VIX {mood.vix}</span>
            <span>S&P {mood.sp500_trend}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
