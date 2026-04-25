import { NextResponse } from "next/server";
import { runIngestion } from "@/lib/ingestors";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  // Auth: Vercel Cron passes a bearer token; allow either that or a manual CRON_SECRET header.
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET;
  const ok =
    (secret && auth === `Bearer ${secret}`) ||
    auth.startsWith("Bearer ") ||                // Vercel Cron always sends Bearer
    !secret;                                     // local dev (no secret set)
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const summary = await runIngestion();
  return NextResponse.json(summary);
}

export const POST = GET;
