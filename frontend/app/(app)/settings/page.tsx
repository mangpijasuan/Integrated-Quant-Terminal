"use client";
import { useState, useEffect } from "react";
import { Settings, Key, Bell, User, Shield, RefreshCw } from "lucide-react";
import { apiGet, apiPost, clearAuthToken } from "@/shared/api";
import toast from "react-hot-toast";
import Spinner from "@/components/ui/Spinner";

interface UserProfile {
  email: string;
  created_at: string;
  plan: string;
  analyses_today: number;
  analyses_limit: number;
}

interface BrokerConfig {
  broker: string;
  ibkr_host: string;
  ibkr_port: number;
  ibkr_client_id: number;
  ibkr_account: string;
  connected: boolean;
  message: string;
  accounts: string[];
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [broker, setBroker] = useState<BrokerConfig | null>(null);
  const [ibkrHost, setIbkrHost] = useState("127.0.0.1");
  const [ibkrPort, setIbkrPort] = useState("4002");
  const [ibkrClientId, setIbkrClientId] = useState("10");
  const [ibkrAccount, setIbkrAccount] = useState("");
  const [saving, setSaving] = useState(false);
  const [testingIbkr, setTestingIbkr] = useState(false);
  const [section, setSection] = useState("profile");

  useEffect(() => {
    async function load() {
      try {
        const p = await apiGet<UserProfile>("/api/auth/me");
        setProfile(p);
      } catch { /* noop */ }
      try {
        const b = await apiGet<BrokerConfig>("/api/settings/broker");
        setBroker(b);
        setIbkrHost(b.ibkr_host);
        setIbkrPort(String(b.ibkr_port));
        setIbkrClientId(String(b.ibkr_client_id));
        setIbkrAccount(b.ibkr_account || "");
      } catch { /* noop */ }
      finally { setLoadingProfile(false); }
    }
    load();
  }, []);

  async function saveBrokerSettings() {
    setSaving(true);
    try {
      await apiPost("/api/settings/broker", {
        ibkr_host: ibkrHost,
        ibkr_port: Number(ibkrPort),
        ibkr_client_id: Number(ibkrClientId),
        ibkr_account: ibkrAccount,
      });
      toast.success("Save IBKR settings in backend/.env and restart the server");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function testIbkrConnection() {
    setTestingIbkr(true);
    try {
      const status = await apiGet<{ connected: boolean; message: string }>("/api/trading/status");
      if (status.connected) {
        toast.success("IBKR connection successful!");
        setBroker(prev => prev ? { ...prev, connected: true, message: status.message } : prev);
      } else {
        toast.error(status.message || "IBKR connection failed");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "IBKR connection failed");
    } finally {
      setTestingIbkr(false);
    }
  }

  const SECTIONS = [
    { id: "profile", label: "Profile", icon: User },
    { id: "api-keys", label: "Broker", icon: Key },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-terminal-accent" />
        <h1 className="text-lg font-semibold">Settings</h1>
      </div>

      <div className="flex gap-5">
        {/* Sidebar nav */}
        <div className="w-48 flex-shrink-0 space-y-0.5">
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm text-left transition-all ${section === s.id ? "bg-terminal-accent/10 text-terminal-accent" : "text-terminal-dim hover:text-terminal-text hover:bg-terminal-muted"}`}>
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-5">
          {/* Profile */}
          {section === "profile" && (
            <div className="bg-terminal-surface border border-terminal-border rounded-lg p-5">
              <h2 className="text-sm font-semibold text-terminal-text mb-4">Profile</h2>
              {loadingProfile ? <Spinner /> : profile ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-terminal-accent/10 border border-terminal-accent/20 flex items-center justify-center text-xl font-mono text-terminal-accent">
                      {profile.email[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-mono text-sm text-terminal-text">{profile.email}</div>
                      <div className="text-xs text-terminal-dim font-mono mt-0.5">
                        Member since {new Date(profile.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="border border-terminal-border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-terminal-dim">Plan</span>
                      <span className="text-terminal-green capitalize">{profile.plan}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-terminal-dim">AI Analyses Today</span>
                      <span className="text-terminal-text">{profile.analyses_today} / {profile.analyses_limit}</span>
                    </div>
                    <div className="w-full h-1.5 bg-terminal-muted rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-terminal-accent rounded-full transition-all"
                        style={{ width: `${Math.min(100, (profile.analyses_today / profile.analyses_limit) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="bg-terminal-accent/5 border border-terminal-accent/20 rounded p-3">
                    <p className="text-xs text-terminal-dim font-mono">
                      Upgrade to Pro for unlimited AI analyses, advanced options strategies, and priority support.
                    </p>
                    <button className="mt-2 text-xs font-mono text-terminal-accent hover:underline">Upgrade to Pro →</button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-terminal-dim">Unable to load profile.</p>
              )}
            </div>
          )}

          {/* API Keys */}
          {section === "api-keys" && (
            <div className="bg-terminal-surface border border-terminal-border rounded-lg p-5 space-y-5">
              <h2 className="text-sm font-semibold text-terminal-text">Interactive Brokers</h2>

              <div className="border border-terminal-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-terminal-text font-mono">IB Gateway / TWS</h3>
                    <p className="text-[10px] text-terminal-dim mt-0.5">
                      Powers execution, portfolio, options chains, and live quotes.
                    </p>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${broker?.connected ? "bg-terminal-green/10 text-terminal-green" : "bg-terminal-muted text-terminal-dim"}`}>
                    {broker?.connected ? "Connected" : "Not connected"}
                  </span>
                </div>

                {broker?.message && (
                  <p className="text-[10px] font-mono text-terminal-dim bg-terminal-muted/40 rounded p-2">{broker.message}</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-terminal-dim uppercase tracking-widest mb-1">Host</label>
                    <input value={ibkrHost} onChange={e => setIbkrHost(e.target.value)}
                      className="w-full bg-terminal-muted border border-terminal-border rounded px-3 py-2 text-sm font-mono text-terminal-text focus:outline-none focus:border-terminal-accent/50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-terminal-dim uppercase tracking-widest mb-1">Port</label>
                    <input value={ibkrPort} onChange={e => setIbkrPort(e.target.value)}
                      className="w-full bg-terminal-muted border border-terminal-border rounded px-3 py-2 text-sm font-mono text-terminal-text focus:outline-none focus:border-terminal-accent/50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-terminal-dim uppercase tracking-widest mb-1">Client ID</label>
                    <input value={ibkrClientId} onChange={e => setIbkrClientId(e.target.value)}
                      className="w-full bg-terminal-muted border border-terminal-border rounded px-3 py-2 text-sm font-mono text-terminal-text focus:outline-none focus:border-terminal-accent/50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-terminal-dim uppercase tracking-widest mb-1">Account (optional)</label>
                    <input value={ibkrAccount} onChange={e => setIbkrAccount(e.target.value)} placeholder="DU1234567"
                      className="w-full bg-terminal-muted border border-terminal-border rounded px-3 py-2 text-sm font-mono text-terminal-text focus:outline-none focus:border-terminal-accent/50" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={saveBrokerSettings} disabled={saving}
                    className="flex items-center gap-2 px-4 py-1.5 bg-terminal-accent/10 border border-terminal-accent/20 text-terminal-accent rounded text-xs font-mono hover:bg-terminal-accent/20 transition-colors disabled:opacity-50">
                    {saving ? <Spinner size={12} /> : null}
                    Save to .env
                  </button>
                  <button onClick={testIbkrConnection} disabled={testingIbkr}
                    className="flex items-center gap-2 px-4 py-1.5 border border-terminal-border text-terminal-dim rounded text-xs font-mono hover:text-terminal-text transition-colors disabled:opacity-50">
                    {testingIbkr ? <Spinner size={12} /> : <RefreshCw className="w-3 h-3" />}
                    Test Connection
                  </button>
                </div>

                <div className="text-[10px] text-terminal-dim font-mono space-y-1">
                  <p>1. Install and log in to <span className="text-terminal-accent">IB Gateway</span> (paper port 4002, live 4001)</p>
                  <p>2. Enable API: Configure → Settings → API → allow 127.0.0.1</p>
                  <p>3. Add to <span className="text-terminal-accent">backend/.env</span>: IBKR_HOST, IBKR_PORT, IBKR_CLIENT_ID, IBKR_ACCOUNT</p>
                  <p>4. Restart <span className="text-terminal-accent">./start.sh</span></p>
                </div>
              </div>

              {/* Gemini */}
              <div className="border border-terminal-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-xs font-semibold text-terminal-text font-mono">Google Gemini (AI)</h3>
                    <p className="text-[10px] text-terminal-dim mt-0.5">Powers AI Analyst, Copilot, and options strategy recommendations.</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-terminal-green/10 text-terminal-green">Configured server-side</span>
                </div>
                <p className="text-[10px] text-terminal-dim font-mono">The Gemini API key is configured on the server. Contact your administrator to update it.</p>
              </div>
            </div>
          )}

          {/* Notifications */}
          {section === "notifications" && (
            <div className="bg-terminal-surface border border-terminal-border rounded-lg p-5">
              <h2 className="text-sm font-semibold text-terminal-text mb-4">Notifications</h2>
              <div className="space-y-3">
                {[
                  { label: "Price alerts", desc: "Get notified when watchlist stocks hit your targets" },
                  { label: "Order fills", desc: "Notifications when paper trading orders are executed" },
                  { label: "AI insights", desc: "Daily AI market summary and signals" },
                  { label: "Portfolio alerts", desc: "Alerts when portfolio loss exceeds threshold" },
                ].map(n => (
                  <div key={n.label} className="flex items-center justify-between py-2 border-b border-terminal-border/50 last:border-0">
                    <div>
                      <div className="text-sm text-terminal-text">{n.label}</div>
                      <div className="text-xs text-terminal-dim">{n.desc}</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-9 h-5 bg-terminal-muted rounded-full peer peer-checked:bg-terminal-accent/30 transition-colors peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-terminal-dim after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:bg-terminal-accent" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security */}
          {section === "security" && (
            <div className="bg-terminal-surface border border-terminal-border rounded-lg p-5">
              <h2 className="text-sm font-semibold text-terminal-text mb-4">Security</h2>
              <div className="space-y-4">
                <div className="border border-terminal-border rounded-lg p-4">
                  <h3 className="text-xs font-semibold text-terminal-text font-mono mb-3">Change Password</h3>
                  <div className="space-y-2">
                    {["Current Password", "New Password", "Confirm New Password"].map(label => (
                      <div key={label}>
                        <label className="block text-[10px] font-mono text-terminal-dim uppercase tracking-widest mb-1">{label}</label>
                        <input type="password" className="w-full bg-terminal-muted border border-terminal-border rounded px-3 py-2 text-sm font-mono text-terminal-text focus:outline-none focus:border-terminal-accent/50" />
                      </div>
                    ))}
                  </div>
                  <button onClick={() => toast("Password change coming soon")} className="mt-3 px-4 py-1.5 bg-terminal-accent/10 border border-terminal-accent/20 text-terminal-accent rounded text-xs font-mono hover:bg-terminal-accent/20 transition-colors">
                    Update Password
                  </button>
                </div>
                <div className="border border-terminal-border rounded-lg p-4">
                  <h3 className="text-xs font-semibold text-terminal-text font-mono mb-1">Session</h3>
                  <p className="text-[10px] text-terminal-dim font-mono mb-3">Your session token expires after 7 days of inactivity.</p>
                  <button onClick={() => { clearAuthToken(); window.location.href = "/login"; }}
                    className="text-xs font-mono text-terminal-red/70 hover:text-terminal-red transition-colors">
                    Sign out of all sessions →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
