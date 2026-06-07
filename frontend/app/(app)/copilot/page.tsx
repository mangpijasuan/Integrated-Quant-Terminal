"use client";
import { useState, useRef, useEffect } from "react";
import { Crosshair, Send, Zap, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { apiPost } from "@/shared/api";
import Spinner from "@/components/ui/Spinner";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  "What's your take on AAPL right now?",
  "Should I hedge my portfolio today?",
  "What sectors look strong this week?",
  "Explain the current market conditions",
  "Any high-probability setups today?",
  "What's the risk/reward on TSLA calls?",
];

const MARKET_SIGNALS = [
  { symbol: "SPY", signal: "Bullish", reason: "Price above 50-day MA, RSI 58", sentiment: "positive" as const },
  { symbol: "QQQ", signal: "Neutral", reason: "Consolidating, watch $480 breakout", sentiment: "neutral" as const },
  { symbol: "BTC", signal: "Caution", reason: "High volatility, support at $60k", sentiment: "negative" as const },
];

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your AI Trading Copilot. I can help you analyze stocks, interpret market signals, suggest trade setups, and answer questions about your portfolio. What would you like to explore today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(text?: string) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    const userMsg: Message = { role: "user", content: msg, timestamp: new Date() };
    setMessages(p => [...p, userMsg]);
    setLoading(true);
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const data = await apiPost<{ response: string }>("/api/copilot/chat", {
        message: msg,
        history,
      });
      setMessages(p => [...p, { role: "assistant", content: data.response, timestamp: new Date() }]);
    } catch {
      setMessages(p => [...p, {
        role: "assistant",
        content: "I'm having trouble connecting to the AI backend. Please ensure your Gemini API key is configured in Settings.",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  const SentimentIcon = ({ s }: { s: "positive" | "negative" | "neutral" }) =>
    s === "positive" ? <TrendingUp className="w-3.5 h-3.5 text-terminal-green" /> :
    s === "negative" ? <TrendingDown className="w-3.5 h-3.5 text-terminal-red" /> :
    <Minus className="w-3.5 h-3.5 text-terminal-dim" />;

  return (
    <div className="animate-fade-in flex gap-5 h-[calc(100vh-130px)]">
      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-terminal-surface border border-terminal-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-terminal-border flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-terminal-accent" />
          <h1 className="text-sm font-semibold text-terminal-text">AI Trading Copilot</h1>
          <span className="text-[10px] font-mono text-terminal-accent bg-terminal-accent/10 px-2 py-0.5 rounded">Powered by Gemini</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg px-4 py-3 ${
                msg.role === "user"
                  ? "bg-terminal-accent/10 border border-terminal-accent/20 text-terminal-text"
                  : "bg-terminal-muted border border-terminal-border text-terminal-text"
              }`}>
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Crosshair className="w-3 h-3 text-terminal-accent" />
                    <span className="text-[10px] font-mono text-terminal-accent">COPILOT</span>
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <div className="text-[10px] text-terminal-dim font-mono mt-1.5">
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-terminal-muted border border-terminal-border rounded-lg px-4 py-3 flex items-center gap-2">
                <Spinner size={14} />
                <span className="text-xs text-terminal-dim font-mono">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        <div className="px-4 py-2 border-t border-terminal-border/50 flex gap-2 overflow-x-auto">
          {QUICK_PROMPTS.map(p => (
            <button key={p} onClick={() => send(p)} className="flex-shrink-0 text-[10px] font-mono text-terminal-dim hover:text-terminal-accent border border-terminal-border hover:border-terminal-accent/30 rounded px-2.5 py-1 transition-colors">
              {p}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-terminal-border flex gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ask your copilot anything about markets, stocks, options..."
            className="flex-1 bg-terminal-muted border border-terminal-border rounded-lg px-4 py-2.5 text-sm text-terminal-text placeholder:text-terminal-dim/50 focus:outline-none focus:border-terminal-accent/50"
          />
          <button onClick={() => send()} disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-terminal-accent text-terminal-bg rounded-lg hover:bg-terminal-accent/90 disabled:opacity-50 transition-colors flex items-center gap-2">
            {loading ? <Spinner size={14} /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Right panel — live signals */}
      <div className="w-64 flex-shrink-0 space-y-4">
        <div className="bg-terminal-surface border border-terminal-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-terminal-accent" />
            <h2 className="text-xs font-mono text-terminal-dim uppercase tracking-widest">Live Signals</h2>
          </div>
          <div className="space-y-3">
            {MARKET_SIGNALS.map(sig => (
              <div key={sig.symbol} className="border border-terminal-border rounded p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-sm font-semibold text-terminal-text">{sig.symbol}</span>
                  <SentimentIcon s={sig.sentiment} />
                </div>
                <div className={`text-xs font-mono font-semibold ${sig.sentiment === "positive" ? "text-terminal-green" : sig.sentiment === "negative" ? "text-terminal-red" : "text-terminal-dim"}`}>
                  {sig.signal}
                </div>
                <div className="text-[10px] text-terminal-dim mt-0.5">{sig.reason}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-terminal-surface border border-terminal-border rounded-lg p-4">
          <h2 className="text-xs font-mono text-terminal-dim uppercase tracking-widest mb-3">Copilot Tips</h2>
          <ul className="space-y-2 text-[10px] text-terminal-dim font-mono">
            <li>• Ask for specific trade setups</li>
            <li>• Request portfolio risk analysis</li>
            <li>• Get options strategy ideas</li>
            <li>• Ask about macro conditions</li>
            <li>• Request earnings analysis</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
