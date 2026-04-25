import { getServiceSupabase } from "@/lib/supabase/service";

export type Plan = "free" | "pro" | "team";

export interface Limits {
  aiGenerationsPerMonth: number;
  savedJobs: number;
  savedSearches: number;
  applicationsTracked: number;
}

export const LIMITS: Record<Plan, Limits> = {
  free: { aiGenerationsPerMonth: 5, savedJobs: 25, savedSearches: 1, applicationsTracked: 50 },
  pro: { aiGenerationsPerMonth: 1000, savedJobs: 1000, savedSearches: 50, applicationsTracked: 10000 },
  team: { aiGenerationsPerMonth: 5000, savedJobs: 5000, savedSearches: 50, applicationsTracked: 50000 },
};

export async function getPlan(userId: string): Promise<Plan> {
  const sb = getServiceSupabase();
  const { data } = await sb.from("profiles").select("plan_tier").eq("id", userId).maybeSingle();
  return (data?.plan_tier as Plan) ?? "free";
}

export async function consumeAiGeneration(userId: string): Promise<{ ok: boolean; remaining: number }> {
  const sb = getServiceSupabase();
  const plan = await getPlan(userId);
  const limit = LIMITS[plan].aiGenerationsPerMonth;

  const since = new Date();
  since.setUTCDate(1); since.setUTCHours(0, 0, 0, 0);

  const { count } = await sb
    .from("ai_generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since.toISOString());

  const used = count ?? 0;
  if (used >= limit) return { ok: false, remaining: 0 };
  return { ok: true, remaining: limit - used - 1 };
}
