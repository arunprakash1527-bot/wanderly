import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const baseField =
  "w-full bg-surface text-fg placeholder:text-fg-muted/60 border rounded-xl px-3 py-2 text-sm " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:border-accent/60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(baseField, "h-10", className)} {...props} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(baseField, "min-h-[120px] py-2.5", className)} {...props} />;
  },
);

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="block text-xs font-medium text-fg-muted mb-1.5">{children}</label>;
}
