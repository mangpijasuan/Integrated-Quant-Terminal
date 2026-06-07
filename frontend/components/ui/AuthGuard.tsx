"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken, clearAuthToken } from "@/shared/api";
import Spinner from "./Spinner";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          router.replace("/login");
          return;
        }

        try {
          const response = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.status === 401) {
            clearAuthToken();
            router.replace("/login");
            return;
          }
        } catch {
          // Network blip — allow client-side session if token exists
        }

        setChecked(true);
      } catch (err) {
        setError("Authentication error");
        clearAuthToken();
        router.replace("/login");
      }
    };

    verifyAuth();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => {
              clearAuthToken();
              router.replace("/login");
            }}
            className="bg-terminal-accent px-4 py-2 rounded hover:opacity-80"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (!checked) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  return <>{children}</>;
}
