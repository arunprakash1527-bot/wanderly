import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const Upsert = z.object({
  jobId: z.string().uuid(),
  status: z.enum(["saved", "applied", "interviewing", "offer", "rejected", "withdrawn"]),
  notes: z.string().max(5000).optional(),
});

export async function POST(req: Request) {
  let sb, user;
  try { ({ sb, user } = await requireUser()); }
  catch { return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }

  const body = Upsert.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const now = new Date().toISOString();
  const row = {
    user_id: user.id,
    job_id: body.data.jobId,
    status: body.data.status,
    notes: body.data.notes ?? null,
    last_status_at: now,
    applied_at: body.data.status === "applied" ? now : undefined,
  };

  const { data, error } = await sb
    .from("applications")
    .upsert(row, { onConflict: "user_id,job_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await sb.from("usage_events").insert({ user_id: user.id, kind: `apply.${body.data.status}`, meta: { jobId: body.data.jobId } });
  return NextResponse.json({ application: data });
}

export async function GET() {
  let sb, user;
  try { ({ sb, user } = await requireUser()); }
  catch { return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }

  const { data } = await sb
    .from("applications")
    .select("id, status, notes, applied_at, last_status_at, jobs(*)")
    .eq("user_id", user.id)
    .order("last_status_at", { ascending: false });
  return NextResponse.json({ applications: data ?? [] });
}
