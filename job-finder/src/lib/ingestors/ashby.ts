import type { NormalizedJob, CompanyType } from "@/lib/types";
import {
  inferSeniority, inferWorkModel, inferEmploymentType, stripHtml, extractYearsExperience,
} from "./normalize";

interface AshbyJob {
  id: string;
  title: string;
  jobUrl: string;
  publishedDate?: string;
  locationName?: string;
  employmentType?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  team?: string;
}

interface AshbyResponse {
  jobs?: AshbyJob[];
  apiResponse?: { jobs?: AshbyJob[] };
}

export async function fetchAshbyCompany(token: string, companyType: CompanyType): Promise<NormalizedJob[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${token}?includeCompensation=true`;
  const res = await fetch(url, { headers: { accept: "application/json" }, next: { revalidate: 0 } });
  if (!res.ok) return [];
  const json = (await res.json()) as AshbyResponse;
  const jobs = json.jobs ?? json.apiResponse?.jobs ?? [];
  return jobs.map((j) => {
    const desc = j.descriptionPlain ?? stripHtml(j.descriptionHtml);
    const loc = j.locationName ?? null;
    return {
      source: "ashby",
      source_id: j.id,
      canonical_url: j.jobUrl,
      title: j.title,
      company: titleCase(token),
      company_logo_url: `https://logo.clearbit.com/${token.replace(/[-_]/g, "")}.com`,
      company_type: companyType,
      location: loc,
      country: /united kingdom|london|uk\b/i.test(loc ?? "") ? "United Kingdom" : null,
      work_model: inferWorkModel(`${desc} ${loc ?? ""}`),
      seniority: inferSeniority(j.title, desc),
      employment_type: inferEmploymentType(`${j.employmentType ?? ""} ${desc}`),
      years_experience: extractYearsExperience(desc),
      description: desc,
      posted_at: j.publishedDate ?? null,
      raw: j,
    } satisfies NormalizedJob;
  });
}

function titleCase(s: string) {
  return s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
