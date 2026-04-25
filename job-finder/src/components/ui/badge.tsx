import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "default" | "accent" | "success" | "warning" | "danger" | "muted";

const toneClass: Record<Tone, string> = {
  default: "bg-muted text-fg",
  accent: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  muted: "bg-muted text-fg-muted",
};

export function Badge({
  className, tone = "default", ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
        toneClass[tone], className,
      )}
      {...props}
    />
  );
}
