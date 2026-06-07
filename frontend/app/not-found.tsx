import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#0a0b0d", color: "#e2e8f0" }}
    >
      <div className="text-center max-w-md">
        <div className="text-6xl font-mono text-[#FFD700] mb-4">404</div>
        <h1 className="text-xl font-semibold mb-2">Page not found</h1>
        <p className="text-sm mb-6" style={{ color: "#64748b" }}>
          That route does not exist in the terminal.
        </p>
        <Link
          href="/login"
          className="inline-block px-5 py-2.5 rounded text-sm font-semibold"
          style={{ backgroundColor: "#FFD700", color: "#0a0b0d" }}
        >
          Go to Login
        </Link>
      </div>
    </div>
  );
}
