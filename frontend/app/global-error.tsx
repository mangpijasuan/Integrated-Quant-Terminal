"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: "#0a0b0d", color: "#e2e8f0", margin: 0 }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: "32rem" }}>
            <div style={{ fontSize: "3rem", color: "#ff3b5c", marginBottom: "1rem" }}>
              ERR
            </div>
            <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
              Application error
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              {error.message || "The app failed to load."}
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                backgroundColor: "#FFD700",
                color: "#0a0b0d",
                border: "none",
                borderRadius: "0.375rem",
                padding: "0.625rem 1.25rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reload app
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
