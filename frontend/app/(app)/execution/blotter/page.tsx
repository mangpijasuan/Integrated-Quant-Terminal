"use client";
import { useEffect, useState } from "react";
import { LineChart, RefreshCw, X } from "lucide-react";
import { apiGet, apiDelete } from "@/shared/api";
import Spinner from "@/components/ui/Spinner";
import toast from "react-hot-toast";

interface Order {
  id: string;
  symbol: string;
  qty: number;
  notional?: number;
  side: string;
  order_type: string;
  status: string;
  submitted_at: string;
  filled_at?: string;
  filled_avg_price?: number;
  limit_price?: number;
  stop_price?: number;
  time_in_force: string;
}

const STATUS_STYLES: Record<string, string> = {
  filled: "text-terminal-green bg-terminal-green/10",
  partially_filled: "text-terminal-yellow bg-terminal-yellow/10",
  open: "text-terminal-accent bg-terminal-accent/10",
  pending_new: "text-terminal-dim bg-terminal-muted",
  cancelled: "text-terminal-dim bg-terminal-muted",
  rejected: "text-terminal-red bg-terminal-red/10",
  expired: "text-terminal-dim bg-terminal-muted",
};

export default function BlotterPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  async function load() {
    try {
      const [open, closed] = await Promise.all([
        apiGet<Order[]>("/api/trading/orders?status=open"),
        apiGet<Order[]>("/api/trading/orders?status=closed"),
      ]);
      setOrders([...open, ...closed]);
    } catch { setOrders([]); }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  async function cancel(id: string) {
    try {
      await apiDelete(`/api/trading/orders/${id}`);
      toast.success("Order cancelled");
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Cancel failed");
    }
  }

  const filtered = statusFilter === "all" ? orders : orders.filter(o => o.status === statusFilter);

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LineChart className="w-5 h-5 text-terminal-accent" />
          <h1 className="text-lg font-semibold">Trade Blotter</h1>
        </div>
        <button onClick={() => { setRefreshing(true); load(); }} className="text-terminal-dim hover:text-terminal-text transition-colors">
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap">
        {["all", "open", "filled", "cancelled", "rejected"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors ${statusFilter === s ? "border-terminal-accent/50 bg-terminal-accent/10 text-terminal-accent" : "border-terminal-border text-terminal-dim hover:text-terminal-text"}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={32} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-terminal-dim">
          <LineChart className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No orders found. Connect IB Gateway in Settings to see your orders.</p>
        </div>
      ) : (
        <div className="bg-terminal-surface border border-terminal-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-terminal-border bg-terminal-muted/30">
                  {["Symbol", "Side", "Type", "Qty", "Limit", "Fill Price", "Status", "Submitted", ""].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] text-terminal-dim uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-terminal-border/30">
                {filtered.map(order => (
                  <tr key={order.id} className="hover:bg-terminal-muted/20 transition-colors group">
                    <td className="px-4 py-3 font-semibold text-terminal-text">{order.symbol}</td>
                    <td className="px-4 py-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${order.side === "buy" ? "bg-terminal-green/10 text-terminal-green" : "bg-terminal-red/10 text-terminal-red"}`}>
                        {order.side?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-terminal-dim">{order.order_type}</td>
                    <td className="px-4 py-3 text-terminal-text">{order.qty ?? (order.notional ? `$${order.notional}` : "—")}</td>
                    <td className="px-4 py-3 text-terminal-dim">{order.limit_price ? `$${order.limit_price}` : "—"}</td>
                    <td className="px-4 py-3 text-terminal-text">{order.filled_avg_price ? `$${order.filled_avg_price.toFixed(2)}` : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${STATUS_STYLES[order.status] ?? "text-terminal-dim"}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-terminal-dim">{order.submitted_at ? new Date(order.submitted_at).toLocaleString() : "—"}</td>
                    <td className="px-4 py-3">
                      {(order.status === "open" || order.status === "pending_new") && (
                        <button onClick={() => cancel(order.id)} className="opacity-0 group-hover:opacity-100 text-terminal-dim hover:text-terminal-red transition-all p-1 rounded">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
