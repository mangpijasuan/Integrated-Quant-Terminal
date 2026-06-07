"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#0a0b0d", color: "#e2e8f0" }}
    >
      <div className="text-center max-w-lg">
        <div className="text-5xl font-mono text-[#ff3b5c] mb-4">ERR</div>
        <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
        <p className="text-sm mb-6 break-words" style={{ color: "#64748b" }}>
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="px-5 py-2.5 rounded text-sm font-semibold mr-3"
          style={{ backgroundColor: "#FFD700", color: "#0a0b0d" }}
        >
          Try again
        </button>
        <a
          href="/login"
          className="inline-block px-5 py-2.5 rounded text-sm font-semibold border"
          style={{ borderColor: "#1e2130", color: "#e2e8f0" }}
        >
          Back to login
        </a>
      </div>
    </div>
  );
}
