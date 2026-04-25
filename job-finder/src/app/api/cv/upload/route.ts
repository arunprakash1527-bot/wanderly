import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const Body = z.object({
  text: z.string().min(80).max(40_000),
  fullName: z.string().min(1).max(200).optional(),
});

export async function POST(req: Request) {
  let sb, user;
  try { ({ sb, user } = await requireUser()); }
  catch { return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { error } = await sb
    .from("profiles")
    .update({
      base_cv_text: parsed.data.text,
      full_name: parsed.data.fullName ?? undefined,
    })
    .eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
