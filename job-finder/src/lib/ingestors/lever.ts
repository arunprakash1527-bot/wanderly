import type { NormalizedJob, CompanyType } from "@/lib/types";
import {
  inferSeniority, inferWorkModel, inferEmploymentType, stripHtml, extractYearsExperience,
} from "./normalize";

interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl?: string;
  createdAt: number;
  categories?: { location?: string; team?: string; commitment?: string };
  descriptionPlain?: string;
  description?: string;
}

export async function fetchLeverCompany(token: string, companyType: CompanyType): Promise<NormalizedJob[]> {
  const url = `https://api.lever.co/v0/postings/${token}?mode=json`;
  const res = await fetch(url, { headers: { accept: "application/json" }, next: { revalidate: 0 } });
  if (!res.ok) return [];
  const data = (await res.json()) as LeverPosting[];
  return (data ?? []).map((j) => {
    const desc = j.descriptionPlain ?? stripHtml(j.description);
    const loc = j.categories?.location ?? null;
    return {
      source: "lever",
      source_id: j.id,
      canonical_url: j.hostedUrl,
      title: j.text,
      company: titleCase(token),
      company_logo_url: `https://logo.clearbit.com/${token.replace(/[-_]/g, "")}.com`,
      company_type: companyType,
      location: loc,
      country: /united kingdom|london|uk\b/i.test(loc ?? "") ? "United Kingdom" : null,
      work_model: inferWorkModel(`${desc} ${loc ?? ""}`),
      seniority: inferSeniority(j.text, desc),
      employment_type: inferEmploymentType(`${j.categories?.commitment ?? ""} ${desc}`),
      years_experience: extractYearsExperience(desc),
      description: desc,
      posted_at: new Date(j.createdAt).toISOString(),
      raw: j,
    } satisfies NormalizedJob;
  });
}

function titleCase(s: string) {
  return s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
