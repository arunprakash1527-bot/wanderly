import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const Prefs = z.object({
  role_keywords: z.array(z.string()).max(25),
  locations: z.array(z.string()).max(10),
  seniority_levels: z.array(z.string()).max(8),
  work_models: z.array(z.string()).max(3),
  employment_types: z.array(z.string()).max(5),
  salary_floor: z.number().int().nullable(),
  salary_currency: z.string().length(3).nullable(),
  include_keywords: z.array(z.string()).max(25),
  exclude_keywords: z.array(z.string()).max(25),
  company_types: z.array(z.string()).max(7),
});

export async function GET() {
  let sb, user;
  try { ({ sb, user } = await requireUser()); }
  catch { return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }
  const { data } = await sb.from("preferences").select("*").eq("user_id", user.id).maybeSingle();
  return NextResponse.json({ preferences: data });
}

export async function PUT(req: Request) {
  let sb, user;
  try { ({ sb, user } = await requireUser()); }
  catch { return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }

  const parsed = Prefs.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await sb
    .from("preferences")
    .upsert({ user_id: user.id, ...parsed.data }, { onConflict: "user_id" })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ preferences: data });
}
