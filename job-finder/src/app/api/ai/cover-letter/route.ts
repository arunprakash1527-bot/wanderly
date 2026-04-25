import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { generateCoverLetter } from "@/lib/ai/cv";
import { estimateCostCents } from "@/lib/ai/claude";
import { consumeAiGeneration } from "@/lib/billing/entitlements";
import { hash32 } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  jobId: z.string().uuid(),
  style: z.enum(["formal", "conversational", "narrative"]),
});

export async function POST(req: Request) {
  let user;
  try { ({ user } = await requireUser()); }
  catch { return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const sb = getServiceSupabase();
  const [{ data: profile }, { data: job }] = await Promise.all([
    sb.from("profiles").select("base_cv_text, full_name").eq("id", user.id).maybeSingle(),
    sb.from("jobs").select("id, title, company, description").eq("id", parsed.data.jobId).maybeSingle(),
  ]);
  if (!profile?.base_cv_text) return NextResponse.json({ error: "no_base_cv" }, { status: 400 });
  if (!job) return NextResponse.json({ error: "job_not_found" }, { status: 404 });

  const inputHash = hash32(`${profile.base_cv_text}|${job.id}|${parsed.data.style}`);
  const { data: cached } = await sb.from("ai_generations")
    .select("content").eq("user_id", user.id).eq("job_id", job.id)
    .eq("kind", "cover_letter").eq("input_hash", inputHash)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (cached?.content) return NextResponse.json({ letter: cached.content, cached: true });

  const ent = await consumeAiGeneration(user.id);
  if (!ent.ok) return NextResponse.json({ error: "limit_reached" }, { status: 402 });

  const { letter, usage } = await generateCoverLetter({
    baseCv: profile.base_cv_text,
    jobTitle: job.title,
    jobCompany: job.company,
    jobDescription: job.description ?? "",
    style: parsed.data.style,
    candidateName: profile.full_name ?? undefined,
  });

  await sb.from("ai_generations").insert({
    user_id: user.id, job_id: job.id, kind: "cover_letter", format: parsed.data.style,
    input_hash: inputHash, content: letter, model: usage.model,
    input_tokens: usage.inputTokens, output_tokens: usage.outputTokens,
    cost_cents: estimateCostCents(usage.inputTokens, usage.outputTokens),
  });
  await sb.from("usage_events").insert({ user_id: user.id, kind: "ai.cover_letter", meta: { jobId: job.id, style: parsed.data.style } });

  return NextResponse.json({ letter, cached: false, remaining: ent.remaining });
}
