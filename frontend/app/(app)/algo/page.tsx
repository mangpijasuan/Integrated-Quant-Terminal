"use client";
import { useState } from "react";
import { BarChart2, Plus, Play, Trash2, Settings2 } from "lucide-react";
import toast from "react-hot-toast";

type ConditionType = "rsi_above" | "rsi_below" | "macd_cross_up" | "macd_cross_down" | "ma_cross_up" | "ma_cross_down" | "price_above_ma" | "price_below_ma";
type ActionType = "buy_market" | "sell_market" | "buy_limit" | "sell_limit";

interface Rule {
  id: string;
  name: string;
  symbol: string;
  condition: ConditionType;
  condition_value: number;
  action: ActionType;
  qty: number;
  active: boolean;
}

const CONDITION_LABELS: Record<ConditionType, string> = {
  rsi_above: "RSI above",
  rsi_below: "RSI below",
  macd_cross_up: "MACD crossover up",
  macd_cross_down: "MACD crossover down",
  ma_cross_up: "MA(50) cross above MA(200)",
  ma_cross_down: "MA(50) cross below MA(200)",
  price_above_ma: "Price above MA",
  price_below_ma: "Price below MA",
};

const ACTION_LABELS: Record<ActionType, string> = {
  buy_market: "Buy Market",
  sell_market: "Sell Market",
  buy_limit: "Buy Limit",
  sell_limit: "Sell Limit",
};

const DEFAULT_RULE: Omit<Rule, "id"> = {
  name: "New Strategy",
  symbol: "AAPL",
  condition: "rsi_below",
  condition_value: 30,
  action: "buy_market",
  qty: 1,
  active: false,
};

export default function AlgoPage() {
  const [rules, setRules] = useState<Rule[]>([
    { id: "1", name: "RSI Oversold Buy", symbol: "AAPL", condition: "rsi_below", condition_value: 30, action: "buy_market", qty: 1, active: false },
    { id: "2", name: "Golden Cross", symbol: "SPY", condition: "ma_cross_up", condition_value: 0, action: "buy_market", qty: 5, active: false },
  ]);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [isNew, setIsNew] = useState(false);

  function startNew() {
    const r: Rule = { ...DEFAULT_RULE, id: Date.now().toString() };
    setEditing(r);
    setIsNew(true);
  }

  function save() {
    if (!editing) return;
    if (isNew) {
      setRules(p => [...p, editing]);
    } else {
      setRules(p => p.map(r => r.id === editing.id ? editing : r));
    }
    setEditing(null);
    setIsNew(false);
    toast.success("Strategy saved");
  }

  function remove(id: string) {
    setRules(p => p.filter(r => r.id !== id));
    toast.success("Strategy removed");
  }

  function toggle(id: string) {
    setRules(p => p.map(r => r.id === id ? { ...r, active: !r.active } : r));
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-terminal-accent" />
          <h1 className="text-lg font-semibold">Algo Trading</h1>
          <span className="text-xs font-mono text-terminal-dim border border-terminal-border rounded px-2 py-0.5">Strategy Builder</span>
        </div>
        <button onClick={startNew} className="flex items-center gap-2 px-4 py-2 bg-terminal-accent/10 border border-terminal-accent/20 text-terminal-accent rounded text-sm font-mono hover:bg-terminal-accent/20 transition-colors">
          <Plus className="w-4 h-4" />
          New Strategy
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-terminal-accent/5 border border-terminal-accent/20 rounded-lg p-3 text-xs text-terminal-dim font-mono">
        Rule-based strategies monitor conditions via IBKR when Gateway is connected. Configure IB Gateway in Settings to enable live monitoring.
      </div>

      {/* Strategy list */}
      <div className="space-y-3">
        {rules.map(rule => (
          <div key={rule.id} className="bg-terminal-surface border border-terminal-border rounded-lg p-4 flex items-start gap-4 hover:border-terminal-accent/20 transition-colors">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className="font-mono text-sm font-semibold text-terminal-text">{rule.name}</span>
                <span className="font-mono text-xs text-terminal-accent bg-terminal-accent/10 px-2 py-0.5 rounded">{rule.symbol}</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${rule.active ? "bg-terminal-green/10 text-terminal-green" : "bg-terminal-muted text-terminal-dim"}`}>
                  {rule.active ? "● ACTIVE" : "○ INACTIVE"}
                </span>
              </div>
              <div className="text-xs text-terminal-dim font-mono">
                When <span className="text-terminal-text">{CONDITION_LABELS[rule.condition]}{rule.condition_value ? ` ${rule.condition_value}` : ""}</span>
                {" → "}
                <span className="text-terminal-accent">{ACTION_LABELS[rule.action]}</span>
                {" "}
                <span className="text-terminal-text">{rule.qty} shares</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggle(rule.id)} className={`p-1.5 rounded transition-colors ${rule.active ? "text-terminal-green hover:text-terminal-dim" : "text-terminal-dim hover:text-terminal-green"}`}>
                <Play className="w-4 h-4" />
              </button>
              <button onClick={() => { setEditing({ ...rule }); setIsNew(false); }} className="p-1.5 rounded text-terminal-dim hover:text-terminal-accent transition-colors">
                <Settings2 className="w-4 h-4" />
              </button>
              <button onClick={() => remove(rule.id)} className="p-1.5 rounded text-terminal-dim hover:text-terminal-red transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {rules.length === 0 && (
          <div className="text-center py-16 text-terminal-dim">
            <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No strategies yet. Create your first rule-based strategy.</p>
          </div>
        )}
      </div>

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-terminal-surface border border-terminal-border rounded-xl p-6 w-full max-w-lg space-y-4">
            <h2 className="text-sm font-semibold text-terminal-text">{isNew ? "New Strategy" : "Edit Strategy"}</h2>
            <div className="space-y-3">
              {[
                { label: "Strategy Name", key: "name" as const, type: "text" },
                { label: "Symbol", key: "symbol" as const, type: "text" },
                { label: "Condition Value", key: "condition_value" as const, type: "number" },
                { label: "Qty (shares)", key: "qty" as const, type: "number" },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-[10px] font-mono text-terminal-dim uppercase tracking-widest mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    value={editing[field.key] as string | number}
                    onChange={e => setEditing(p => p ? { ...p, [field.key]: field.type === "number" ? Number(e.target.value) : e.target.value.toUpperCase() } : p)}
                    className="w-full bg-terminal-muted border border-terminal-border rounded px-3 py-2 text-sm font-mono text-terminal-text focus:outline-none focus:border-terminal-accent/50"
                  />
                </div>
              ))}
              <div>
                <label className="block text-[10px] font-mono text-terminal-dim uppercase tracking-widest mb-1">Condition</label>
                <select value={editing.condition} onChange={e => setEditing(p => p ? { ...p, condition: e.target.value as ConditionType } : p)}
                  className="w-full bg-terminal-muted border border-terminal-border rounded px-3 py-2 text-sm font-mono text-terminal-text focus:outline-none focus:border-terminal-accent/50">
                  {Object.entries(CONDITION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-terminal-dim uppercase tracking-widest mb-1">Action</label>
                <select value={editing.action} onChange={e => setEditing(p => p ? { ...p, action: e.target.value as ActionType } : p)}
                  className="w-full bg-terminal-muted border border-terminal-border rounded px-3 py-2 text-sm font-mono text-terminal-text focus:outline-none focus:border-terminal-accent/50">
                  {Object.entries(ACTION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={save} className="flex-1 py-2 bg-terminal-accent text-terminal-bg font-semibold rounded text-sm hover:bg-terminal-accent/90 transition-colors">Save</button>
              <button onClick={() => setEditing(null)} className="flex-1 py-2 border border-terminal-border text-terminal-dim rounded text-sm hover:text-terminal-text transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
