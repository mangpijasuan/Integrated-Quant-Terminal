"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, TrendingUp, Lock, Mail, User } from "lucide-react";
import toast from "react-hot-toast";
import { apiPost, setAuthToken } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const data = await apiPost<{ access_token: string; user: { name: string } }>(
        "/api/auth/signup",
        { name, email, password }
      );
      setAuthToken(data.access_token);
      toast.success("Account created! Welcome to Integrated Quant Terminal.");
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Signup failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded border border-terminal-accent/30 bg-terminal-accent/10 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-terminal-accent" />
        </div>
        <div>
          <div className="text-sm font-mono text-terminal-accent tracking-widest uppercase">
            Integrated Quant
          </div>
          <div className="text-xs text-terminal-dim font-mono">Terminal v1.0</div>
        </div>
      </div>

      <div className="bg-terminal-surface border border-terminal-border rounded-lg p-8">
        <h1 className="text-xl font-semibold text-terminal-text mb-1">Create account</h1>
        <p className="text-sm text-terminal-dim mb-6">
          Free tier includes 5 AI analyses/day
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-terminal-dim uppercase tracking-widest mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-terminal-dim" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="John Smith"
                className="w-full bg-terminal-muted border border-terminal-border rounded pl-10 pr-4 py-2.5 text-sm text-terminal-text placeholder:text-terminal-dim/50 focus:outline-none focus:border-terminal-accent/50 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-terminal-dim uppercase tracking-widest mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-terminal-dim" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="trader@example.com"
                className="w-full bg-terminal-muted border border-terminal-border rounded pl-10 pr-4 py-2.5 text-sm text-terminal-text placeholder:text-terminal-dim/50 focus:outline-none focus:border-terminal-accent/50 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-terminal-dim uppercase tracking-widest mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-terminal-dim" />
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Min. 8 characters"
                className="w-full bg-terminal-muted border border-terminal-border rounded pl-10 pr-10 py-2.5 text-sm text-terminal-text placeholder:text-terminal-dim/50 focus:outline-none focus:border-terminal-accent/50 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-terminal-dim hover:text-terminal-text transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-terminal-accent text-terminal-bg font-semibold py-2.5 rounded text-sm hover:bg-terminal-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all glow-accent mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-terminal-bg/30 border-t-terminal-bg rounded-full animate-spin" />
                Creating account...
              </span>
            ) : (
              "Create Free Account"
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-terminal-border text-center text-sm text-terminal-dim">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-terminal-accent hover:underline font-medium"
          >
            Sign in
          </Link>
        </div>
      </div>

      <p className="text-center text-xs text-terminal-dim mt-4 font-mono">
        Upgrade to Pro for unlimited analyses — $29/month
      </p>
    </div>
  );
}
