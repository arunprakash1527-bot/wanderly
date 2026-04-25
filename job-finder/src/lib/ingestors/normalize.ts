import type { Seniority, WorkModel, EmploymentType } from "@/lib/types";

const SENIORITY_PATTERNS: Array<[RegExp, Seniority]> = [
  [/\b(c[\s-]?suite|chief|cto|cfo|cpo|ceo)\b/i, "csuite"],
  [/\b(vice president|\bvp\b)\b/i, "vp"],
  [/\bdirector\b/i, "director"],
  [/\bprincipal\b/i, "principal"],
  [/\bstaff\b/i, "staff"],
  [/\b(senior|sr\.?|lead)\b/i, "senior"],
  [/\b(junior|jr\.?|entry|graduate|new[-\s]?grad|associate|intern)\b/i, "entry"],
];

export function inferSeniority(title: string, description?: string): Seniority {
  const hay = `${title} ${description ?? ""}`;
  for (const [re, level] of SENIORITY_PATTERNS) if (re.test(hay)) return level;
  return "mid";
}

export function inferWorkModel(text: string): WorkModel | null {
  const t = text.toLowerCase();
  if (/\b(fully\s+)?remote\b/.test(t) && !/hybrid/.test(t)) return "remote";
  if (/hybrid/.test(t)) return "hybrid";
  if (/on[-\s]?site|in[-\s]?office/.test(t)) return "onsite";
  return null;
}

export function inferEmploymentType(text: string): EmploymentType {
  const t = text.toLowerCase();
  if (/intern(ship)?/.test(t)) return "internship";
  if (/contract|fixed[-\s]?term|\bftc\b/.test(t)) return "fixed_term";
  if (/part[-\s]?time/.test(t)) return "part_time";
  return "full_time";
}

export function extractYearsExperience(description?: string | null): string {
  if (!description) return "Not specified";
  const m = description.match(/(\d{1,2})\+?\s*(?:to\s*\d{1,2}\s*)?years?(?:\s+of)?\s+(?:relevant\s+)?(?:experience|exp\.?)/i);
  return m ? `${m[1]}+ years` : "Not specified";
}

export function stripHtml(html?: string | null): string {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isLondonLocation(loc?: string | null): boolean {
  if (!loc) return false;
  return /\blondon\b/i.test(loc) || /\bgreater london\b/i.test(loc);
}

export function isUkLocation(loc?: string | null): boolean {
  if (!loc) return false;
  return /united kingdom|\buk\b|england|scotland|wales|\blondon\b|manchester|edinburgh|bristol|cambridge/i.test(loc);
}
