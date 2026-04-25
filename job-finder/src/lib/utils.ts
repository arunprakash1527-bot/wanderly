import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function relativeTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  const w = Math.floor(days / 7);
  if (w < 5) return `${w}w ago`;
  return new Date(iso).toLocaleDateString();
}

export function fmtSalary(min?: number | null, max?: number | null, currency?: string | null) {
  if (!min && !max) return null;
  const c = currency ?? "GBP";
  const sym = c === "GBP" ? "£" : c === "USD" ? "$" : c === "EUR" ? "€" : "";
  const n = (v: number) => v >= 1000 ? `${Math.round(v / 1000)}K` : `${v}`;
  if (min && max) return `${sym}${n(min)}–${sym}${n(max)}`;
  return `${sym}${n((min || max)!)}+`;
}

export function hash32(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) { h ^= input.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
}
