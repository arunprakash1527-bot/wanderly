import type { NormalizedJob } from "@/lib/types";
import {
  inferSeniority, inferWorkModel, inferEmploymentType, stripHtml, extractYearsExperience,
} from "./normalize";

interface ApifyLinkedInItem {
  link?: string;
  jobUrl?: string;
  title?: string;
  companyName?: string;
  location?: string;
  description?: string;
  descriptionHtml?: string;
  postedAt?: string;
  publishedAt?: string;
  seniorityLevel?: string;
  employmentType?: string;
  applicationsCount?: string | number;
  companyLogo?: string;
}

interface RunOpts {
  searchTerms: string[];
  locations: string[];
  postedTimeRange?: "past24h" | "pastWeek" | "pastMonth";
  maxResults?: number;
}

/**
 * Run the Apify LinkedIn Jobs Scraper actor. Synchronous run returns dataset items inline.
 * No-op if APIFY_TOKEN is not set.
 */
export async function fetchApifyLinkedIn(opts: RunOpts): Promise<NormalizedJob[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return [];
  const actor = (process.env.APIFY_LINKEDIN_ACTOR ?? "apify/linkedin-jobs-scraper").replace("/", "~");

  const url = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${token}`;
  const body = {
    queries: opts.searchTerms,
    locations: opts.locations,
    publishedAt: opts.postedTimeRange ?? "pastWeek",
    rows: Math.min(opts.maxResults ?? 50, 100),
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];

  const items = (await res.json()) as ApifyLinkedInItem[];
  return items
    .filter((i) => i.link || i.jobUrl)
    .map((j) => {
      const canonical = (j.link ?? j.jobUrl)!;
      const desc = j.description ?? stripHtml(j.descriptionHtml);
      const loc = j.location ?? null;
      return {
        source: "apify_linkedin",
        source_id: canonical,
        canonical_url: canonical,
        title: j.title ?? "Untitled",
        company: j.companyName ?? "Unknown",
        company_logo_url: j.companyLogo ?? null,
        company_type: null,
        location: loc,
        country: /united kingdom|london|uk\b/i.test(loc ?? "") ? "United Kingdom" : null,
        work_model: inferWorkModel(`${desc} ${loc ?? ""}`),
        seniority: mapLinkedInSeniority(j.seniorityLevel) ?? inferSeniority(j.title ?? "", desc),
        employment_type: inferEmploymentType(`${j.employmentType ?? ""} ${desc}`),
        years_experience: extractYearsExperience(desc),
        description: desc,
        posted_at: j.publishedAt ?? j.postedAt ?? null,
        raw: j,
      } satisfies NormalizedJob;
    });
}

function mapLinkedInSeniority(s?: string) {
  if (!s) return null;
  const t = s.toLowerCase();
  if (t.includes("entry") || t.includes("intern")) return "entry" as const;
  if (t.includes("associate") || t.includes("mid")) return "mid" as const;
  if (t.includes("director")) return "director" as const;
  if (t.includes("executive")) return "vp" as const;
  if (t.includes("senior") || t.includes("lead")) return "senior" as const;
  return null;
}
