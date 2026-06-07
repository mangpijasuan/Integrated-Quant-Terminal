"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookOpen, Plus, RefreshCw, X, Pencil,
} from "lucide-react";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/shared/api";
import { colorForChange } from "@/shared/utils";
import Spinner from "@/components/ui/Spinner";
import toast from "react-hot-toast";

interface JournalSummary {
  starting_capital: number;
  current_equity: number;
  realized_pnl: number;
  total_return_pct: number;
  open_trades: number;
  closed_trades: number;
  total_trades: number;
  win_rate: number;
  wins: number;
  losses: number;
  avg_win: number;
  avg_loss: number;
  currency: string;
}

interface Trade {
  id: number;
  symbol: string;
  side: "long" | "short";
  qty: number;
  entry_price: number;
  exit_price: number | null;
  entry_date: string;
  exit_date: string | null;
  fees: number;
  strategy: string | null;
  notes: string | null;
  pnl: number | null;
  status: "open" | "closed";
}

const EMPTY_FORM = {
  symbol: "",
  side: "long" as "long" | "short",
  qty: "",
  entry_price: "",
  exit_price: "",
  entry_date: new Date().toISOString().slice(0, 10),
  exit_date: "",
  fees: "0",
  strategy: "",
  notes: "",
};

function StatCard({
  label, value, sub, positive,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-terminal-surface border border-terminal-border rounded-lg p-4">
      <div className="text-[10px] font-mono text-terminal-dim uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-xl font-mono font-bold ${
        positive === undefined ? "text-terminal-text" : positive ? "text-terminal-green" : "text-terminal-red"
      }`}>
        {value}
      </div>
      {sub && <div className="text-xs font-mono text-terminal-dim mt-0.5">{sub}</div>}
    </div>
  );
}

export default function JournalPage() {
  const [summary, setSummary] = useState<JournalSummary | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [closingId, setClosingId] = useState<number | null>(null);
  const [closePrice, setClosePrice] = useState("");

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const load = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    try {
      const [sum, list] = await Promise.all([
        apiGet<JournalSummary>("/api/journal/summary"),
        apiGet<Trade[]>("/api/journal/trades"),
      ]);
      setSummary(sum);
      setTrades(list);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load journal");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(trade: Trade) {
    setEditingId(trade.id);
    setForm({
      symbol: trade.symbol,
      side: trade.side,
      qty: String(trade.qty),
      entry_price: String(trade.entry_price),
      exit_price: trade.exit_price != null ? String(trade.exit_price) : "",
      entry_date: trade.entry_date,
      exit_date: trade.exit_date ?? "",
      fees: String(trade.fees),
      strategy: trade.strategy ?? "",
      notes: trade.notes ?? "",
    });
    setShowForm(true);
  }

  async function saveTrade() {
    const sym = form.symbol.trim().toUpperCase();
    if (!sym || !form.qty || !form.entry_price) {
      toast.error("Symbol, qty, and entry price are required");
      return;
    }

    const body = {
      symbol: sym,
      side: form.side,
      qty: Number(form.qty),
      entry_price: Number(form.entry_price),
      exit_price: form.exit_price ? Number(form.exit_price) : null,
      entry_date: form.entry_date,
      exit_date: form.exit_date || null,
      fees: Number(form.fees) || 0,
      strategy: form.strategy || null,
      notes: form.notes || null,
    };

    setSaving(true);
    try {
      if (editingId) {
        await apiPut(`/api/journal/trades/${editingId}`, body);
        toast.success("Trade updated");
      } else {
        await apiPost("/api/journal/trades", body);
        toast.success("Trade logged");
      }
      setShowForm(false);
      load(true);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeTrade(id: number) {
    if (!confirm("Delete this trade from your journal?")) return;
    try {
      await apiDelete(`/api/journal/trades/${id}`);
      toast.success("Trade removed");
      load(true);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function closeTrade(id: number) {
    const price = Number(closePrice);
    if (!price || price <= 0) {
      toast.error("Enter a valid exit price");
      return;
    }
    try {
      await apiPut(`/api/journal/trades/${id}`, {
        exit_price: price,
        exit_date: new Date().toISOString().slice(0, 10),
      });
      toast.success("Trade closed");
      setClosingId(null);
      setClosePrice("");
      load(true);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Close failed");
    }
  }

  async function resetCapital() {
    const input = prompt("Starting capital (USD):", "25000");
    if (!input) return;
    const val = Number(input);
    if (!val || val <= 0) {
      toast.error("Invalid amount");
      return;
    }
    try {
      const sum = await apiPatch<JournalSummary>("/api/journal/settings", { starting_capital: val });
      setSummary(sum);
      toast.success(`Starting capital set to $${fmt(val)}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-terminal-accent" />
          <h1 className="text-lg font-semibold">Trading Journal</h1>
          <span className="text-xs font-mono text-terminal-dim border border-terminal-border rounded px-2 py-0.5">
            ${summary ? fmt(summary.starting_capital) : "25,000"} start
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetCapital} className="text-xs font-mono text-terminal-dim hover:text-terminal-text border border-terminal-border rounded px-2.5 py-1.5 transition-colors">
            Edit capital
          </button>
          <button onClick={() => load(true)} className="text-terminal-dim hover:text-terminal-text transition-colors p-1">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button onClick={openAdd} className="flex items-center gap-1.5 bg-terminal-accent/10 text-terminal-accent border border-terminal-accent/20 rounded px-3 py-1.5 text-xs font-mono hover:bg-terminal-accent/20 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Log trade
          </button>
        </div>
      </div>

      {loading && !summary ? (
        <div className="flex justify-center py-20"><Spinner size={32} /></div>
      ) : summary && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Current Equity" value={`$${fmt(summary.current_equity)}`} sub={`Started $${fmt(summary.starting_capital)}`} />
            <StatCard
              label="Realized P&L"
              value={`${summary.realized_pnl >= 0 ? "+" : ""}$${fmt(summary.realized_pnl)}`}
              sub={`${summary.total_return_pct >= 0 ? "+" : ""}${summary.total_return_pct}% return`}
              positive={summary.realized_pnl >= 0}
            />
            <StatCard label="Win Rate" value={`${summary.win_rate}%`} sub={`${summary.wins}W / ${summary.losses}L (${summary.closed_trades} closed)`} positive={summary.win_rate >= 50} />
            <StatCard label="Open Trades" value={String(summary.open_trades)} sub={`${summary.total_trades} total logged`} />
          </div>

          {(summary.avg_win !== 0 || summary.avg_loss !== 0) && (
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <StatCard label="Avg Win" value={`+$${fmt(summary.avg_win)}`} positive />
              <StatCard label="Avg Loss" value={`$${fmt(summary.avg_loss)}`} positive={false} />
            </div>
          )}

          {showForm && (
            <div className="bg-terminal-surface border border-terminal-border rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">{editingId ? "Edit Trade" : "Log New Trade"}</h2>
                <button onClick={() => setShowForm(false)} className="text-terminal-dim hover:text-terminal-text"><X className="w-4 h-4" /></button>
              </div>

              <div className="grid grid-cols-2 gap-2 max-w-xs">
                {(["long", "short"] as const).map((s) => (
                  <button key={s} onClick={() => setForm((f) => ({ ...f, side: s }))}
                    className={`py-2 rounded text-xs font-mono font-semibold transition-all ${
                      form.side === s
                        ? s === "long" ? "bg-terminal-green text-terminal-bg" : "bg-terminal-red text-white"
                        : "border border-terminal-border text-terminal-dim"
                    }`}>
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { key: "symbol", label: "Symbol", placeholder: "AAPL" },
                  { key: "qty", label: "Qty", placeholder: "100", type: "number" },
                  { key: "entry_price", label: "Entry $", placeholder: "150.00", type: "number" },
                  { key: "exit_price", label: "Exit $ (optional)", placeholder: "155.00", type: "number" },
                  { key: "entry_date", label: "Entry date", type: "date" },
                  { key: "exit_date", label: "Exit date", type: "date" },
                  { key: "fees", label: "Fees $", placeholder: "0", type: "number" },
                  { key: "strategy", label: "Strategy", placeholder: "Breakout" },
                ].map(({ key, label, placeholder, type }) => (
                  <div key={key}>
                    <label className="block text-[10px] font-mono text-terminal-dim uppercase tracking-widest mb-1">{label}</label>
                    <input
                      type={type ?? "text"}
                      value={(form as Record<string, string>)[key]}
                      onChange={(e) => {
                        const val = key === "symbol" ? e.target.value.toUpperCase() : e.target.value;
                        setForm((f) => ({ ...f, [key]: val }));
                      }}
                      placeholder={placeholder}
                      className="w-full bg-terminal-muted border border-terminal-border rounded px-3 py-2 text-sm font-mono text-terminal-text focus:outline-none focus:border-terminal-accent/50"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-[10px] font-mono text-terminal-dim uppercase tracking-widest mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Setup, thesis, lessons learned..."
                  className="w-full bg-terminal-muted border border-terminal-border rounded px-3 py-2 text-sm text-terminal-text focus:outline-none focus:border-terminal-accent/50 resize-none"
                />
              </div>

              <button onClick={saveTrade} disabled={saving}
                className="bg-terminal-accent/10 text-terminal-accent border border-terminal-accent/20 rounded px-4 py-2 text-sm font-mono hover:bg-terminal-accent/20 disabled:opacity-50 flex items-center gap-2">
                {saving ? <Spinner size={14} /> : <BookOpen className="w-4 h-4" />}
                {editingId ? "Update trade" : "Save trade"}
              </button>
            </div>
          )}

          <div className="bg-terminal-surface border border-terminal-border rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-terminal-border flex items-center justify-between">
              <h2 className="text-xs font-mono text-terminal-dim uppercase tracking-widest">Trade Log</h2>
              <span className="text-xs font-mono text-terminal-dim">{trades.length} entries</span>
            </div>

            {trades.length === 0 ? (
              <div className="text-center py-16 text-terminal-dim">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="mb-2">No trades logged yet.</p>
                <p className="text-xs max-w-sm mx-auto">Track your paper or live trades here. Starting equity is $25,000 — P&L updates as you close trades.</p>
                <button onClick={openAdd} className="mt-4 text-xs text-terminal-accent hover:underline font-mono">Log your first trade</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-terminal-border/50">
                      {["Date", "Symbol", "Side", "Qty", "Entry", "Exit", "P&L", "Strategy", "Status", ""].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-mono text-terminal-dim uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-terminal-border/30">
                    {trades.map((t) => (
                      <tr key={t.id} className="hover:bg-terminal-muted/30 transition-colors group">
                        <td className="px-4 py-3 font-mono text-terminal-dim text-xs">{t.entry_date}</td>
                        <td className="px-4 py-3 font-mono font-semibold">{t.symbol}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${t.side === "long" ? "bg-terminal-green/10 text-terminal-green" : "bg-terminal-red/10 text-terminal-red"}`}>
                            {t.side.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono">{t.qty}</td>
                        <td className="px-4 py-3 font-mono">${fmt(t.entry_price)}</td>
                        <td className="px-4 py-3 font-mono text-terminal-dim">
                          {closingId === t.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                autoFocus
                                type="number"
                                value={closePrice}
                                onChange={(e) => setClosePrice(e.target.value)}
                                placeholder="Exit $"
                                className="w-20 bg-terminal-muted border border-terminal-border rounded px-1.5 py-0.5 text-xs font-mono"
                              />
                              <button onClick={() => closeTrade(t.id)} className="text-terminal-green text-[10px] font-mono">OK</button>
                              <button onClick={() => { setClosingId(null); setClosePrice(""); }} className="text-terminal-dim text-[10px]">✕</button>
                            </div>
                          ) : t.exit_price != null ? `$${fmt(t.exit_price)}` : (
                            <button onClick={() => setClosingId(t.id)} className="text-[10px] font-mono text-terminal-accent hover:underline">Close</button>
                          )}
                        </td>
                        <td className={`px-4 py-3 font-mono ${t.pnl != null ? colorForChange(t.pnl) : "text-terminal-dim"}`}>
                          {t.pnl != null ? `${t.pnl >= 0 ? "+" : ""}$${fmt(t.pnl)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-terminal-dim max-w-[100px] truncate">{t.strategy ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${t.status === "open" ? "bg-terminal-accent/10 text-terminal-accent" : "bg-terminal-muted text-terminal-dim"}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(t)} className="p-1 text-terminal-dim hover:text-terminal-accent"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => removeTrade(t.id)} className="p-1 text-terminal-dim hover:text-terminal-red"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-[10px] font-mono text-terminal-dim text-center">
            Journal tracks logged trades separately from IBKR. Starting capital defaults to $25,000 per account.
          </p>
        </>
      )}
    </div>
  );
}
