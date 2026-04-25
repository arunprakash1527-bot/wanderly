import { getServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { relativeTime } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUSES = ["saved", "applied", "interviewing", "offer", "rejected", "withdrawn"] as const;
type Status = typeof STATUSES[number];

const tone: Record<Status, "muted" | "accent" | "warning" | "success" | "danger"> = {
  saved: "muted", applied: "accent", interviewing: "warning",
  offer: "success", rejected: "danger", withdrawn: "muted",
};

export default async function ApplicationsPage() {
  const sb = getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return (
      <div>
        <PageHeader title="Applications" />
        <div className="px-6 md:px-10 py-10 text-sm text-fg-muted">
          Sign in to track your applications.
        </div>
      </div>
    );
  }

  const { data } = await sb
    .from("applications")
    .select("id, status, applied_at, last_status_at, notes, jobs(id, title, company, canonical_url, location)")
    .eq("user_id", user.id)
    .order("last_status_at", { ascending: false });

  const apps = (data ?? []) as unknown as Array<{
    id: string; status: Status; applied_at: string | null; last_status_at: string;
    notes: string | null;
    jobs: { id: string; title: string; company: string; canonical_url: string; location: string | null };
  }>;

  const buckets: Record<Status, typeof apps> = {
    saved: [], applied: [], interviewing: [], offer: [], rejected: [], withdrawn: [],
  };
  for (const a of apps) buckets[a.status].push(a);

  return (
    <div>
      <PageHeader title="Applications" subtitle={`${apps.length} tracked`} />
      <div className="px-6 md:px-10 py-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {STATUSES.map((s) => (
          <div key={s}>
            <div className="flex items-center gap-2 mb-3">
              <Badge tone={tone[s]} className="capitalize">{s}</Badge>
              <span className="text-xs text-fg-muted">{buckets[s].length}</span>
            </div>
            <div className="space-y-2">
              {buckets[s].map((a) => (
                <Card key={a.id} className="p-3">
                  <Link href={a.jobs.canonical_url} target="_blank" className="block">
                    <p className="text-sm font-medium truncate">{a.jobs.title}</p>
                    <p className="text-xs text-fg-muted truncate">
                      {a.jobs.company}{a.jobs.location ? ` · ${a.jobs.location}` : ""}
                    </p>
                    <p className="text-[11px] text-fg-muted mt-1">Updated {relativeTime(a.last_status_at)}</p>
                  </Link>
                </Card>
              ))}
              {buckets[s].length === 0 && <p className="text-xs text-fg-muted">—</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
