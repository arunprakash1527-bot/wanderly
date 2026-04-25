import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClass: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:opacity-90",
  secondary: "bg-surface text-fg border hover:bg-muted",
  ghost: "text-fg hover:bg-muted",
  danger: "bg-danger text-white hover:opacity-90",
};

const sizeClass: Record<Size, string> = {
  sm: "h-8 px-3 text-sm rounded-lg",
  md: "h-10 px-4 text-sm rounded-xl",
  lg: "h-12 px-5 text-base rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", size = "md", ...props }, ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-colors",
        "disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        variantClass[variant], sizeClass[size], className,
      )}
      {...props}
    />
  );
});
