import { getServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/AppShell";
import { JobsBoard } from "./JobsBoard";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const sb = getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();

  // Pull preferences (if signed in) to apply server-side default filtering.
  let prefs: { role_keywords: string[]; locations: string[]; seniority_levels: string[]; work_models: string[] } | null = null;
  if (user) {
    const { data } = await sb.from("preferences").select("*").eq("user_id", user.id).maybeSingle();
    prefs = data as typeof prefs;
  }

  let q = sb.from("jobs")
    .select("id, title, company, company_logo_url, location, work_model, seniority, posted_at, canonical_url, salary_min, salary_max, salary_currency, source, description, years_experience, employment_type")
    .order("posted_at", { ascending: false, nullsFirst: false })
    .limit(200);

  if (prefs?.locations?.length) q = q.or(prefs.locations.map((l) => `location.ilike.%${l}%`).join(","));
  if (prefs?.seniority_levels?.length) q = q.in("seniority", prefs.seniority_levels);

  const { data: jobs } = await q;

  return (
    <div>
      <PageHeader
        title="Jobs"
        subtitle={prefs ? "Filtered to your preferences. Tweak filters below to widen or narrow." : "Set preferences to personalise this feed."}
      />
      <div className="px-6 md:px-10 py-6">
        <JobsBoard initialJobs={jobs ?? []} />
      </div>
    </div>
  );
}
