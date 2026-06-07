import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Integrated Quant Terminal",
  description:
    "Institutional-grade market intelligence for the retail trader. Real-time data, AI analysis, and quant tools in one terminal.",
  keywords: ["stock analysis", "AI trading", "quant terminal", "market data"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ backgroundColor: "#0a0b0d", color: "#e2e8f0" }}>
      <body
        className="bg-terminal-bg text-terminal-text antialiased min-h-screen"
        style={{ backgroundColor: "#0a0b0d", color: "#e2e8f0" }}
      >
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#111318",
              color: "#e2e8f0",
              border: "1px solid #1e2130",
              fontFamily: "Inter, sans-serif",
              fontSize: "13px",
            },
            success: { iconTheme: { primary: "#00ff88", secondary: "#111318" } },
            error: { iconTheme: { primary: "#ff3b5c", secondary: "#111318" } },
          }}
        />
      </body>
    </html>
  );
}
