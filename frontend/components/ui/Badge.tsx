import { cn } from "@/shared/utils";

type Variant = "green" | "red" | "accent" | "muted" | "yellow";

const styles: Record<Variant, string> = {
  green: "bg-terminal-green/10 text-terminal-green border-terminal-green/20",
  red: "bg-terminal-red/10 text-terminal-red border-terminal-red/20",
  accent: "bg-terminal-accent/10 text-terminal-accent border-terminal-accent/20",
  muted: "bg-terminal-muted text-terminal-dim border-terminal-border",
  yellow: "bg-terminal-yellow/10 text-terminal-yellow border-terminal-yellow/20",
};

export default function Badge({
  children,
  variant = "muted",
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border",
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
