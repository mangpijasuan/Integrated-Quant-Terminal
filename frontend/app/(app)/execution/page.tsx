"use client";
import { useState } from "react";
import { Zap, TrendingUp, TrendingDown } from "lucide-react";
import { apiPost } from "@/lib/api";
import Spinner from "@/components/ui/Spinner";
import toast from "react-hot-toast";

type Side = "buy" | "sell";
type OrderType = "market" | "limit" | "stop" | "stop_limit";
type TIF = "day" | "gtc" | "ioc" | "fok";

interface OrderResult {
  id: string;
  symbol: string;
  qty: number;
  side: string;
  order_type: string;
  status: string;
  submitted_at: string;
  limit_price?: number;
  stop_price?: number;
}

export default function ExecutionPage() {
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState<Side>("buy");
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [qty, setQty] = useState("");
  const [notional, setNotional] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [tif, setTif] = useState<TIF>("day");
  const [loading, setLoading] = useState(false);
  const [lastOrder, setLastOrder] = useState<OrderResult | null>(null);
  const [useNotional, setUseNotional] = useState(false);

  async function submit() {
    const sym = symbol.trim().toUpperCase();
    if (!sym) { toast.error("Enter a symbol"); return; }
    if (!qty && !notional) { toast.error("Enter qty or dollar amount"); return; }
    if ((orderType === "limit" || orderType === "stop_limit") && !limitPrice) { toast.error("Limit price required"); return; }
    if ((orderType === "stop" || orderType === "stop_limit") && !stopPrice) { toast.error("Stop price required"); return; }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        symbol: sym,
        side,
        order_type: orderType,
        time_in_force: tif,
      };
      if (useNotional && notional) body.notional = Number(notional);
      else if (qty) body.qty = Number(qty);
      if (limitPrice) body.limit_price = Number(limitPrice);
      if (stopPrice) body.stop_price = Number(stopPrice);

      const result = await apiPost<OrderResult>("/api/trading/orders", body);
      setLastOrder(result);
      toast.success(`Order submitted: ${side.toUpperCase()} ${result.qty ?? notional} ${sym}`);
      setSymbol(""); setQty(""); setNotional(""); setLimitPrice(""); setStopPrice("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Order failed");
    } finally {
      setLoading(false);
    }
  }

  const needsLimit = orderType === "limit" || orderType === "stop_limit";
  const needsStop = orderType === "stop" || orderType === "stop_limit";

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-terminal-accent" />
        <h1 className="text-lg font-semibold">Order Entry</h1>
        <span className="text-xs font-mono text-terminal-dim border border-terminal-border rounded px-2 py-0.5">IBKR</span>
      </div>

      <div className="max-w-xl">
        <div className="bg-terminal-surface border border-terminal-border rounded-lg p-5 space-y-4">
          {/* Side toggle */}
          <div className="grid grid-cols-2 gap-2">
            {(["buy", "sell"] as Side[]).map(s => (
              <button key={s} onClick={() => setSide(s)}
                className={`py-2.5 rounded-lg font-semibold text-sm transition-all ${
                  side === s
                    ? s === "buy" ? "bg-terminal-green text-terminal-bg" : "bg-terminal-red text-white"
                    : "border border-terminal-border text-terminal-dim hover:text-terminal-text"
                }`}>
                {s === "buy" ? <><TrendingUp className="w-4 h-4 inline mr-1.5" />Buy</> : <><TrendingDown className="w-4 h-4 inline mr-1.5" />Sell</>}
              </button>
            ))}
          </div>

          {/* Symbol */}
          <div>
            <label className="block text-[10px] font-mono text-terminal-dim uppercase tracking-widest mb-1">Symbol</label>
            <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="AAPL"
              className="w-full bg-terminal-muted border border-terminal-border rounded px-3 py-2.5 text-sm font-mono text-terminal-text focus:outline-none focus:border-terminal-accent/50" />
          </div>

          {/* Order type */}
          <div>
            <label className="block text-[10px] font-mono text-terminal-dim uppercase tracking-widest mb-1">Order Type</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(["market", "limit", "stop", "stop_limit"] as OrderType[]).map(t => (
                <button key={t} onClick={() => setOrderType(t)}
                  className={`py-1.5 rounded text-xs font-mono border transition-colors ${orderType === t ? "border-terminal-accent/50 bg-terminal-accent/10 text-terminal-accent" : "border-terminal-border text-terminal-dim hover:text-terminal-text"}`}>
                  {t.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          {/* Qty / Notional toggle */}
          <div>
            <div className="flex items-center gap-4 mb-1">
              <label className="text-[10px] font-mono text-terminal-dim uppercase tracking-widest">
                {useNotional ? "Dollar Amount" : "Quantity (shares)"}
              </label>
              <button onClick={() => setUseNotional(p => !p)} className="text-[10px] font-mono text-terminal-accent hover:underline">
                Switch to {useNotional ? "shares" : "$ amount"}
              </button>
            </div>
            <div className="relative">
              {useNotional && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-terminal-dim text-sm">$</span>}
              <input
                type="number"
                value={useNotional ? notional : qty}
                onChange={e => useNotional ? setNotional(e.target.value) : setQty(e.target.value)}
                placeholder={useNotional ? "1000" : "10"}
                className={`w-full bg-terminal-muted border border-terminal-border rounded px-3 py-2.5 text-sm font-mono text-terminal-text focus:outline-none focus:border-terminal-accent/50 ${useNotional ? "pl-7" : ""}`}
              />
            </div>
          </div>

          {/* Limit price */}
          {needsLimit && (
            <div>
              <label className="block text-[10px] font-mono text-terminal-dim uppercase tracking-widest mb-1">Limit Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-terminal-dim text-sm">$</span>
                <input type="number" value={limitPrice} onChange={e => setLimitPrice(e.target.value)} placeholder="150.00"
                  className="w-full bg-terminal-muted border border-terminal-border rounded pl-7 pr-3 py-2.5 text-sm font-mono text-terminal-text focus:outline-none focus:border-terminal-accent/50" />
              </div>
            </div>
          )}

          {/* Stop price */}
          {needsStop && (
            <div>
              <label className="block text-[10px] font-mono text-terminal-dim uppercase tracking-widest mb-1">Stop Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-terminal-dim text-sm">$</span>
                <input type="number" value={stopPrice} onChange={e => setStopPrice(e.target.value)} placeholder="148.00"
                  className="w-full bg-terminal-muted border border-terminal-border rounded pl-7 pr-3 py-2.5 text-sm font-mono text-terminal-text focus:outline-none focus:border-terminal-accent/50" />
              </div>
            </div>
          )}

          {/* TIF */}
          <div>
            <label className="block text-[10px] font-mono text-terminal-dim uppercase tracking-widest mb-1">Time in Force</label>
            <select value={tif} onChange={e => setTif(e.target.value as TIF)}
              className="w-full bg-terminal-muted border border-terminal-border rounded px-3 py-2 text-sm font-mono text-terminal-text focus:outline-none focus:border-terminal-accent/50">
              <option value="day">Day</option>
              <option value="gtc">Good Till Cancelled</option>
              <option value="ioc">Immediate or Cancel</option>
              <option value="fok">Fill or Kill</option>
            </select>
          </div>

          {/* Submit */}
          <button onClick={submit} disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              side === "buy"
                ? "bg-terminal-green text-terminal-bg hover:bg-terminal-green/90"
                : "bg-terminal-red text-white hover:bg-terminal-red/90"
            } disabled:opacity-50`}>
            {loading ? <Spinner size={16} /> : <Zap className="w-4 h-4" />}
            {loading ? "Submitting..." : `Place ${side.toUpperCase()} Order`}
          </button>
        </div>

        {/* Last order confirmation */}
        {lastOrder && (
          <div className="mt-4 bg-terminal-green/5 border border-terminal-green/20 rounded-lg p-4 animate-fade-in">
            <div className="text-xs font-mono text-terminal-green mb-2">Order Submitted</div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div><span className="text-terminal-dim">ID: </span><span className="text-terminal-text">{lastOrder.id?.slice(0, 8)}…</span></div>
              <div><span className="text-terminal-dim">Status: </span><span className="text-terminal-green">{lastOrder.status}</span></div>
              <div><span className="text-terminal-dim">Symbol: </span><span className="text-terminal-text">{lastOrder.symbol}</span></div>
              <div><span className="text-terminal-dim">Side: </span><span className="text-terminal-text">{lastOrder.side?.toUpperCase()}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
