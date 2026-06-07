"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken, clearAuthToken } from "@/shared/api";
import Spinner from "./Spinner";

const LOADING_STYLE = {
  minHeight: "100vh",
  backgroundColor: "#0a0b0d",
  color: "#e2e8f0",
} as const;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 5000
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const verifyAuth = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          router.replace("/login");
          return;
        }

        try {
          const response = await fetchWithTimeout("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.status === 401) {
            clearAuthToken();
            router.replace("/login");
            return;
          }
        } catch {
          // Backend offline or slow — allow cached session.
        }

        if (active) setChecked(true);
      } catch {
        if (!active) return;
        setError("Authentication error");
        clearAuthToken();
        router.replace("/login");
      }
    };

    verifyAuth();
    return () => {
      active = false;
    };
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={LOADING_STYLE}>
        <div className="text-center">
          <p className="mb-4" style={{ color: "#ff3b5c" }}>
            {error}
          </p>
          <button
            type="button"
            onClick={() => {
              clearAuthToken();
              router.replace("/login");
            }}
            className="px-4 py-2 rounded font-semibold"
            style={{ backgroundColor: "#FFD700", color: "#0a0b0d" }}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (!checked) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={LOADING_STYLE}
      >
        <Spinner size={32} />
        <p className="text-sm font-mono" style={{ color: "#64748b" }}>
          Loading terminal...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
