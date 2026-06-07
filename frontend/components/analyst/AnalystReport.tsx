"use client";
import Badge from "@/components/ui/Badge";
import { TrendingUp, TrendingDown, AlertTriangle, Brain, DollarSign, BarChart2, Users } from "lucide-react";
import { formatPrice, formatLargeNumber } from "@/lib/utils";

export interface AnalystReportData {
  ticker: string;
  company_name: string;
  current_price: number;
  currency: string;
  market_cap: number;
  pe_ratio: number | null;
  sector: string;
  industry: string;
  verdict: "BUY" | "HOLD" | "SELL";
  confidence: number; // 0–100
  target_price: number;
  upside_pct: number;
  bull_thesis: string[];
  bear_thesis: string[];
  key_risks: string[];
  dcf_estimate: number | null;
  summary: string;
  personas: {
    name: string;
    stance: "Bullish" | "Bearish" | "Neutral";
    quote: string;
  }[];
  generated_at: string;
}

const verdictStyles = {
  BUY: "green" as const,
  HOLD: "yellow" as const,
  SELL: "red" as const,
};

export default function AnalystReport({ report }: { report: AnalystReportData }) {
  const isUp = report.upside_pct >= 0;

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="bg-terminal-surface border border-terminal-border rounded-lg p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-semibold text-terminal-text">{report.company_name}</h2>
              <span className="font-mono text-terminal-dim text-sm">({report.ticker})</span>
              <Badge variant="muted">{report.sector}</Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-terminal-dim">
              <span className="font-mono">
                {report.currency} ${formatPrice(report.current_price)}
              </span>
              <span>Market Cap: {formatLargeNumber(report.market_cap)}</span>
              {report.pe_ratio && <span>P/E: {report.pe_ratio.toFixed(1)}x</span>}
            </div>
          </div>

          <div className="text-right">
            <Badge variant={verdictStyles[report.verdict]} className="text-base px-4 py-1.5 mb-2">
              {report.verdict}
            </Badge>
            <div className="text-sm text-terminal-dim">
              Confidence:{" "}
              <span className="font-mono text-terminal-text">{report.confidence}%</span>
            </div>
          </div>
        </div>

        {/* Price targets */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-terminal-border">
          <div>
            <div className="text-xs font-mono text-terminal-dim uppercase tracking-widest mb-1">
              Current Price
            </div>
            <div className="text-lg font-mono font-bold text-terminal-text">
              ${formatPrice(report.current_price)}
            </div>
          </div>
          <div>
            <div className="text-xs font-mono text-terminal-dim uppercase tracking-widest mb-1">
              Target Price
            </div>
            <div className="text-lg font-mono font-bold text-terminal-accent">
              ${formatPrice(report.target_price)}
            </div>
          </div>
          {report.dcf_estimate && (
            <div>
              <div className="text-xs font-mono text-terminal-dim uppercase tracking-widest mb-1">
                DCF Estimate
              </div>
              <div className="text-lg font-mono font-bold text-terminal-yellow">
                ${formatPrice(report.dcf_estimate)}
              </div>
            </div>
          )}
        </div>

        {/* Upside bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-terminal-dim font-mono">Potential Upside</span>
            <span className={`font-mono font-bold ${isUp ? "text-terminal-green" : "text-terminal-red"}`}>
              {isUp ? "+" : ""}{report.upside_pct.toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-terminal-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${isUp ? "bg-terminal-green" : "bg-terminal-red"}`}
              style={{ width: `${Math.min(Math.abs(report.upside_pct), 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-terminal-surface border border-terminal-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-terminal-accent" />
          <h3 className="text-xs font-mono text-terminal-dim uppercase tracking-widest">
            AI Summary
          </h3>
        </div>
        <p className="text-sm text-terminal-text leading-relaxed">{report.summary}</p>
      </div>

      {/* Bull & Bear */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-terminal-surface border border-terminal-green/20 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-terminal-green" />
            <h3 className="text-xs font-mono text-terminal-green uppercase tracking-widest">
              Bull Case
            </h3>
          </div>
          <ul className="space-y-2">
            {report.bull_thesis.map((point, i) => (
              <li key={i} className="flex gap-2 text-sm text-terminal-text">
                <span className="text-terminal-green mt-0.5 flex-shrink-0">▸</span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-terminal-surface border border-terminal-red/20 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-terminal-red" />
            <h3 className="text-xs font-mono text-terminal-red uppercase tracking-widest">
              Bear Case
            </h3>
          </div>
          <ul className="space-y-2">
            {report.bear_thesis.map((point, i) => (
              <li key={i} className="flex gap-2 text-sm text-terminal-text">
                <span className="text-terminal-red mt-0.5 flex-shrink-0">▸</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Key Risks */}
      <div className="bg-terminal-surface border border-terminal-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-terminal-yellow" />
          <h3 className="text-xs font-mono text-terminal-dim uppercase tracking-widest">
            Key Risks
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {report.key_risks.map((risk, i) => (
            <Badge key={i} variant="yellow">{risk}</Badge>
          ))}
        </div>
      </div>

      {/* AI Personas */}
      <div className="bg-terminal-surface border border-terminal-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-terminal-accent" />
          <h3 className="text-xs font-mono text-terminal-dim uppercase tracking-widest">
            Investor Perspectives
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {report.personas.map((p) => (
            <div
              key={p.name}
              className="bg-terminal-muted border border-terminal-border rounded p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-terminal-text">{p.name}</span>
                <Badge
                  variant={
                    p.stance === "Bullish" ? "green" : p.stance === "Bearish" ? "red" : "muted"
                  }
                >
                  {p.stance}
                </Badge>
              </div>
              <p className="text-xs text-terminal-dim leading-relaxed italic">
                &ldquo;{p.quote}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-terminal-dim text-center font-mono pb-2">
        Analysis generated {new Date(report.generated_at).toLocaleString()} · Not financial advice
      </p>
    </div>
  );
}
