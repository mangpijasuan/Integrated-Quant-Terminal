export default function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      className="inline-block rounded-full border-2 border-terminal-border border-t-terminal-accent animate-spin"
      style={{ width: size, height: size }}
    />
  );
}
