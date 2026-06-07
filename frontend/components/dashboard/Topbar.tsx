"use client";
import { useEffect, useState } from "react";
import { Bell, Wifi, WifiOff, Menu, LayoutDashboard, LineChart, Newspaper, Zap, Brain, PieChart, Bot, Crosshair } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApiCache } from "@/lib/use-api-cache";
import { useSidebar } from "@/lib/sidebar-context";
import { cn } from "@/lib/utils";

interface TickerItem {
  symbol: string;
  price: number;
  change_pct: number;
}

const TOP_NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/markets",   icon: LineChart,        label: "Markets" },
  { href: "/news",      icon: Newspaper,        label: "News" },
  { href: "/portfolio", icon: PieChart,         label: "Portfolio" },
  { href: "/analyst",   icon: Brain,            label: "AI Analyst" },
  { href: "/execution", icon: Zap,              label: "Trade" },
  { href: "/autopilot", icon: Bot,              label: "Autopilot" },
  { href: "/copilot",   icon: Crosshair,        label: "Copilot" },
];

export default function Topbar() {
  const { data: overview } = useApiCache<TickerItem[]>(
    "market:overview",
    "/api/market/overview",
    { refreshInterval: 30_000 }
  );
  const tickers = overview ?? [];
  const [online, setOnline] = useState(true);
  const [time, setTime] = useState("");
  const { collapsed, toggle } = useSidebar();
  const pathname = usePathname();

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  return (
    <header className="bg-terminal-surface border-b border-terminal-border flex flex-col">
      {/* Top row — hamburger + ticker tape + status */}
      <div className="h-11 flex items-center px-3 gap-3">
        {/* Hamburger */}
        <button
          onClick={toggle}
          className="flex-shrink-0 p-1.5 rounded text-terminal-dim hover:text-terminal-text hover:bg-terminal-muted transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Live ticker tape */}
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-6 ticker-animate whitespace-nowrap">
            {[...tickers, ...tickers].map((t, i) => (
              <span key={i} className="inline-flex items-center gap-2 text-xs font-mono">
                <span className="text-terminal-dim">{t.symbol}</span>
                <span className="text-terminal-text">${t.price.toFixed(2)}</span>
                <span className={t.change_pct >= 0 ? "text-terminal-green" : "text-terminal-red"}>
                  {t.change_pct >= 0 ? "+" : ""}{t.change_pct.toFixed(2)}%
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Right status */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs font-mono text-terminal-dim hidden sm:block">{time} EST</span>
          {online ? (
            <Wifi className="w-3.5 h-3.5 text-terminal-green" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-terminal-red" />
          )}
          <button className="relative text-terminal-dim hover:text-terminal-text transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-terminal-accent" />
          </button>
        </div>
      </div>

      {/* Nav row */}
      <div className="flex items-center gap-0.5 px-3 pb-1.5 overflow-x-auto scrollbar-hide">
        {TOP_NAV.map(item => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono whitespace-nowrap transition-all flex-shrink-0",
                active
                  ? "bg-terminal-accent/10 text-terminal-accent border border-terminal-accent/20"
                  : "text-terminal-dim hover:text-terminal-text hover:bg-terminal-muted border border-transparent"
              )}
            >
              <item.icon className="w-3 h-3" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
