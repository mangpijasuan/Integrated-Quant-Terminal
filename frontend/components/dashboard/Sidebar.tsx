"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Brain, LineChart, Star, LogOut, TrendingUp,
  Settings, Newspaper, PieChart, Layers, Bot, Zap, PlayCircle,
  Crosshair, BarChart2, ChevronRight, ChevronDown, BookOpen,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/shared/utils";
import { clearAuthToken } from "@/shared/api";
import { useSidebar } from "@/shared/sidebar-context";

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  soon?: boolean;
  badge?: string;
  children?: NavItem[];
};

const NAV: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/markets",   icon: LineChart,        label: "Markets" },
  { href: "/watchlist", icon: Star,             label: "Watchlist" },
  { href: "/news",      icon: Newspaper,        label: "News" },
  { href: "/portfolio", icon: PieChart,         label: "Portfolio" },
  { href: "/analyst",   icon: Brain,            label: "AI Analyst", badge: "AI" },
  { href: "/options",   icon: Layers,           label: "Options", badge: "AI" },
  {
    href: "/algo",
    icon: BarChart2,
    label: "Algo Trading",
    children: [
      { href: "/algo",           icon: BarChart2,   label: "Strategy Builder" },
      { href: "/algo/backtest",  icon: PlayCircle,  label: "Backtest" },
    ],
  },
  {
    href: "/execution",
    icon: Zap,
    label: "Execution",
    children: [
      { href: "/execution",        icon: Zap,       label: "Order Entry" },
      { href: "/execution/blotter",icon: LineChart, label: "Trade Blotter" },
    ],
  },
  { href: "/journal", icon: BookOpen, label: "Trading Journal" },
  { href: "/autopilot", icon: Bot,       label: "Autopilot", badge: "AUTO" },
  { href: "/copilot",   icon: Crosshair, label: "Copilot",   badge: "AI" },
  { href: "/settings",  icon: Settings,  label: "Settings" },
];

const BADGE_STYLES: Record<string, string> = {
  AI:   "bg-terminal-accent/20 text-terminal-accent",
  AUTO: "bg-terminal-green/20 text-terminal-green",
  NEW:  "bg-terminal-yellow/20 text-terminal-yellow",
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed } = useSidebar();
  const [expanded, setExpanded] = useState<string[]>(["/algo", "/execution"]);

  function logout() {
    clearAuthToken();
    router.push("/login");
  }

  function toggle(href: string) {
    setExpanded(p => p.includes(href) ? p.filter(h => h !== href) : [...p, href]);
  }

  function renderItem(item: NavItem, depth = 0) {
    const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expanded.includes(item.href);

    return (
      <div key={item.href}>
        <div
          title={collapsed ? item.label : undefined}
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-all cursor-pointer group",
            depth > 0 && "ml-4 pl-3 border-l border-terminal-border/50",
            collapsed && depth === 0 && "justify-center px-2",
            active
              ? "bg-terminal-accent/10 text-terminal-accent"
              : "text-terminal-dim hover:text-terminal-text hover:bg-terminal-muted",
          )}
          onClick={() => hasChildren ? toggle(item.href) : router.push(item.href)}
        >
          <item.icon className="w-4 h-4 flex-shrink-0" />

          {!collapsed && (
            <>
              <span className="flex-1 text-sm">{item.label}</span>

              {item.badge && (
                <span className={cn("text-[9px] font-mono px-1 py-0.5 rounded font-bold", BADGE_STYLES[item.badge] ?? "bg-terminal-muted text-terminal-dim")}>
                  {item.badge}
                </span>
              )}

              {hasChildren && (
                <ChevronDown className={cn("w-3 h-3 transition-transform text-terminal-dim", isExpanded && "rotate-180")} />
              )}
              {active && !hasChildren && (
                <ChevronRight className="w-3 h-3 text-terminal-accent/50" />
              )}
            </>
          )}

          {collapsed && item.badge && (
            <span className={cn("absolute right-0.5 top-0.5 w-1.5 h-1.5 rounded-full", item.badge === "AI" ? "bg-terminal-accent" : "bg-terminal-green")} />
          )}
        </div>

        {!collapsed && hasChildren && isExpanded && (
          <div className="mt-0.5 space-y-0.5">
            {item.children!.map(child => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <aside className={cn(
      "min-h-screen bg-terminal-surface border-r border-terminal-border flex flex-col transition-all duration-300 ease-in-out",
      collapsed ? "w-[56px]" : "w-[220px]"
    )}>
      {/* Logo */}
      <div className={cn("px-4 py-4 border-b border-terminal-border flex items-center gap-2.5", collapsed && "px-3 justify-center")}>
        <div className="w-8 h-8 rounded border border-terminal-accent/30 bg-terminal-accent/10 flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-4 h-4 text-terminal-accent" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-[10px] font-mono text-terminal-accent tracking-wider uppercase leading-none">Integrated Quant</div>
            <div className="text-[10px] font-mono text-terminal-dim tracking-wider uppercase leading-tight">Terminal v1.0</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {NAV.map(item => renderItem(item))}
      </nav>

      {/* Bottom */}
      {!collapsed && (
        <div className="px-2 pb-3 border-t border-terminal-border pt-3 space-y-1">
          <div className="px-3 py-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-terminal-dim uppercase tracking-widest">Plan</span>
              <span className="text-[10px] font-mono text-terminal-green">Free</span>
            </div>
            <div className="w-full h-1 bg-terminal-muted rounded-full overflow-hidden">
              <div className="h-full bg-terminal-accent rounded-full" style={{ width: "20%" }} />
            </div>
            <div className="text-[10px] text-terminal-dim mt-1">1/5 analyses today</div>
            <Link href="#" className="text-[10px] text-terminal-accent hover:underline mt-1 block">
              Upgrade to Pro →
            </Link>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm text-terminal-dim hover:text-terminal-red hover:bg-terminal-red/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}

      {collapsed && (
        <div className="pb-3 border-t border-terminal-border pt-3 flex justify-center">
          <button
            onClick={logout}
            title="Sign out"
            className="p-2 rounded text-terminal-dim hover:text-terminal-red hover:bg-terminal-red/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
