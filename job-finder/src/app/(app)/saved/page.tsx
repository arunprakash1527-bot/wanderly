import { getServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { relativeTime } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const sb = getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return (
      <div>
        <PageHeader title="Saved" />
        <div className="px-6 md:px-10 py-10 text-sm text-fg-muted">Sign in to see saved jobs.</div>
      </div>
    );
  }
  const { data } = await sb
    .from("applications")
    .select("id, last_status_at, jobs(id, title, company, canonical_url, location)")
    .eq("user_id", user.id).eq("status", "saved")
    .order("last_status_at", { ascending: false });

  const items = (data ?? []) as unknown as Array<{
    id: string; last_status_at: string;
    jobs: { id: string; title: string; company: string; canonical_url: string; location: string | null };
  }>;

  return (
    <div>
      <PageHeader title="Saved" subtitle={`${items.length} saved roles`} />
      <div className="px-6 md:px-10 py-6 grid md:grid-cols-2 gap-3">
        {items.map((a) => (
          <Card key={a.id} className="p-4">
            <Link href={a.jobs.canonical_url} target="_blank" className="block">
              <p className="font-medium truncate">{a.jobs.title}</p>
              <p className="text-sm text-fg-muted truncate">
                {a.jobs.company}{a.jobs.location ? ` · ${a.jobs.location}` : ""}
              </p>
              <p className="text-xs text-fg-muted mt-1">Saved {relativeTime(a.last_status_at)}</p>
            </Link>
          </Card>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-fg-muted md:col-span-2">No saved jobs yet. Save a role from the board.</p>
        )}
      </div>
    </div>
  );
}
