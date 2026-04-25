import type { NormalizedJob, CompanyType } from "@/lib/types";
import {
  inferSeniority, inferWorkModel, inferEmploymentType, stripHtml, extractYearsExperience,
} from "./normalize";

interface GhJob {
  id: number;
  absolute_url: string;
  title: string;
  updated_at: string;
  location?: { name: string };
  content?: string;
  metadata?: Array<{ name: string; value: unknown }>;
}

export async function fetchGreenhouseCompany(token: string, companyType: CompanyType): Promise<NormalizedJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`;
  const res = await fetch(url, { headers: { accept: "application/json" }, next: { revalidate: 0 } });
  if (!res.ok) return [];
  const json = (await res.json()) as { jobs: GhJob[] };
  return (json.jobs ?? []).map((j) => {
    const desc = stripHtml(j.content);
    const loc = j.location?.name ?? null;
    return {
      source: "greenhouse",
      source_id: String(j.id),
      canonical_url: j.absolute_url,
      title: j.title,
      company: titleCase(token),
      company_logo_url: clearbitLogo(token),
      company_type: companyType,
      location: loc,
      country: countryFromLocation(loc),
      work_model: inferWorkModel(desc + " " + (loc ?? "")),
      seniority: inferSeniority(j.title, desc),
      employment_type: inferEmploymentType(j.title + " " + desc),
      years_experience: extractYearsExperience(desc),
      description: desc,
      posted_at: j.updated_at,
      raw: j,
    } satisfies NormalizedJob;
  });
}

function titleCase(s: string) {
  return s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function countryFromLocation(loc: string | null): string | null {
  if (!loc) return null;
  if (/united kingdom|\buk\b|london|manchester|england/i.test(loc)) return "United Kingdom";
  if (/united states|\busa?\b|new york|san francisco|seattle/i.test(loc)) return "United States";
  return null;
}

function clearbitLogo(token: string): string {
  const guess = token.replace(/[-_]/g, "");
  return `https://logo.clearbit.com/${guess}.com`;
}
