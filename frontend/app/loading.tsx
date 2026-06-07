export default function Loading() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ backgroundColor: "#0a0b0d", color: "#e2e8f0" }}
    >
      <div
        className="rounded-full border-2 animate-spin"
        style={{
          width: 32,
          height: 32,
          borderColor: "#1e2130",
          borderTopColor: "#FFD700",
        }}
      />
      <p className="text-sm font-mono" style={{ color: "#64748b" }}>
        Loading...
      </p>
    </div>
  );
}
