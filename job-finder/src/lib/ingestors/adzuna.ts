import type { NormalizedJob } from "@/lib/types";
import {
  inferSeniority, inferWorkModel, inferEmploymentType, stripHtml, extractYearsExperience,
} from "./normalize";

interface AdzunaItem {
  id: string;
  redirect_url: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string;
  created: string;
  contract_type?: string;
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: string;
}

export async function fetchAdzuna(opts: { what: string; where: string; pages?: number }): Promise<NormalizedJob[]> {
  const id = process.env.ADZUNA_APP_ID;
  const key = process.env.ADZUNA_APP_KEY;
  if (!id || !key) return [];

  const out: NormalizedJob[] = [];
  const pages = Math.min(opts.pages ?? 2, 5);
  for (let p = 1; p <= pages; p++) {
    const url = `https://api.adzuna.com/v1/api/jobs/gb/search/${p}?app_id=${id}&app_key=${key}&results_per_page=50&what=${encodeURIComponent(opts.what)}&where=${encodeURIComponent(opts.where)}&content-type=application/json`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) break;
    const json = (await res.json()) as { results: AdzunaItem[] };
    for (const j of json.results ?? []) {
      const desc = stripHtml(j.description);
      out.push({
        source: "adzuna",
        source_id: j.id,
        canonical_url: j.redirect_url,
        title: j.title,
        company: j.company?.display_name ?? "Unknown",
        company_logo_url: null,
        company_type: null,
        location: j.location?.display_name ?? null,
        country: "United Kingdom",
        work_model: inferWorkModel(desc),
        seniority: inferSeniority(j.title, desc),
        employment_type: inferEmploymentType(`${j.contract_type ?? ""} ${desc}`),
        years_experience: extractYearsExperience(desc),
        salary_min: j.salary_min ? Math.round(j.salary_min) : null,
        salary_max: j.salary_max ? Math.round(j.salary_max) : null,
        salary_currency: "GBP",
        description: desc,
        posted_at: j.created,
        raw: j,
      });
    }
  }
  return out;
}
