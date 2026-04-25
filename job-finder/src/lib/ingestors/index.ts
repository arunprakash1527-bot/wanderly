import type { NormalizedJob, CompanyType } from "@/lib/types";
import { fetchGreenhouseCompany } from "./greenhouse";
import { fetchLeverCompany } from "./lever";
import { fetchAshbyCompany } from "./ashby";
import { fetchApifyLinkedIn } from "./apify";
import { fetchAdzuna } from "./adzuna";
import companies from "../../../db/seed/companies.json";
import { getServiceSupabase } from "@/lib/supabase/service";

interface IngestionSummary {
  totalFetched: number;
  inserted: number;
  updated: number;
  bySource: Record<string, number>;
  errors: Array<{ source: string; token?: string; error: string }>;
}

export async function runIngestion(): Promise<IngestionSummary> {
  const summary: IngestionSummary = {
    totalFetched: 0, inserted: 0, updated: 0, bySource: {}, errors: [],
  };

  const all: NormalizedJob[] = [];

  // Greenhouse / Lever / Ashby — concurrent per source, capped
  await pmap(companies.greenhouse, 6, async (c) => {
    try {
      const jobs = await fetchGreenhouseCompany(c.token, c.type as CompanyType);
      all.push(...jobs.map((j) => ({ ...j, company: c.name ?? j.company })));
      summary.bySource.greenhouse = (summary.bySource.greenhouse ?? 0) + jobs.length;
    } catch (e) {
      summary.errors.push({ source: "greenhouse", token: c.token, error: String(e) });
    }
  });

  await pmap(companies.lever, 6, async (c) => {
    try {
      const jobs = await fetchLeverCompany(c.token, c.type as CompanyType);
      all.push(...jobs.map((j) => ({ ...j, company: c.name ?? j.company })));
      summary.bySource.lever = (summary.bySource.lever ?? 0) + jobs.length;
    } catch (e) {
      summary.errors.push({ source: "lever", token: c.token, error: String(e) });
    }
  });

  await pmap(companies.ashby, 6, async (c) => {
    try {
      const jobs = await fetchAshbyCompany(c.token, c.type as CompanyType);
      all.push(...jobs.map((j) => ({ ...j, company: c.name ?? j.company })));
      summary.bySource.ashby = (summary.bySource.ashby ?? 0) + jobs.length;
    } catch (e) {
      summary.errors.push({ source: "ashby", token: c.token, error: String(e) });
    }
  });

  // Apify (optional — only if APIFY_TOKEN present)
  try {
    const linkedin = await fetchApifyLinkedIn({
      searchTerms: ["Product Manager", "AI Product Manager", "Senior Product Manager"],
      locations: ["London, United Kingdom"],
      postedTimeRange: "pastWeek",
      maxResults: 50,
    });
    all.push(...linkedin);
    summary.bySource.apify_linkedin = linkedin.length;
  } catch (e) {
    summary.errors.push({ source: "apify_linkedin", error: String(e) });
  }

  // Adzuna (optional)
  try {
    const adz = await fetchAdzuna({ what: "product manager", where: "London", pages: 2 });
    all.push(...adz);
    summary.bySource.adzuna = adz.length;
  } catch (e) {
    summary.errors.push({ source: "adzuna", error: String(e) });
  }

  summary.totalFetched = all.length;

  // Dedupe by canonical_url, last write wins
  const byUrl = new Map<string, NormalizedJob>();
  for (const j of all) byUrl.set(j.canonical_url, j);

  // Upsert in batches
  const sb = getServiceSupabase();
  const rows = Array.from(byUrl.values()).map((j) => ({
    ...j,
    last_seen_at: new Date().toISOString(),
    raw: j.raw ?? null,
  }));

  for (const batch of chunk(rows, 200)) {
    const { error, count } = await sb.from("jobs").upsert(batch, {
      onConflict: "canonical_url",
      count: "exact",
    });
    if (error) summary.errors.push({ source: "db.upsert", error: error.message });
    else summary.inserted += count ?? 0;
  }

  return summary;
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function pmap<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const next = queue.shift();
      if (next) await fn(next);
    }
  });
  await Promise.all(workers);
}
