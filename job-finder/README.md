# Pathway

Find roles, tailor your application, apply, track. A focused job-search app for serious candidates.

> Codename. Rebrand to your liking — change the title in `src/app/layout.tsx`, the wordmark in `src/components/layout/Sidebar.tsx`, and the package name in `package.json`.

## What it does (v1)

- **Multi-source job board.** Daily-refreshed feed pulled from Greenhouse, Lever, Ashby, Apify (LinkedIn), and Adzuna. All deduped on canonical URL.
- **Candidate preferences.** Roles, locations, seniority, work model, salary floor, must-include / must-exclude keywords, company types.
- **AI tailoring.** One click rewrites your CV for a specific posting (three formats: ATS-clean / Modern / Executive) and drafts a cover letter (formal / conversational / narrative).
- **Apply + track.** Click Apply → posting opens in new tab → application logged in your tracker (Saved → Applied → Interviewing → Offer / Rejected / Withdrawn).
- **Multi-tenant by default.** Postgres RLS isolates every user's data.
- **Pricing-ready.** `plan_tier` on profiles, `subscriptions` table, Stripe webhook scaffolded. Free tier enforced at API layer.

## v2 roadmap

- Interview question generation per role
- Mock interview chat (text), then voice
- PDF parsing for CV upload
- Browser extension for autofill on employer ATSs

## Stack

- Next.js 14 App Router · TypeScript · Tailwind
- Supabase (Postgres + Auth + Storage)
- Anthropic Claude (Sonnet 4.6) via `@anthropic-ai/sdk`
- Stripe-ready
- Vercel Cron for daily job ingestion

## Repo layout

```
job-finder/
  src/
    app/
      page.tsx                       # marketing landing
      (app)/                         # signed-in app shell
        jobs/                        # board + filters + detail drawer
        saved/
        applications/                # tracker (kanban-style)
        preferences/                 # preferences + CV
        onboarding/
      (auth)/sign-in/
      api/
        cron/refresh-jobs/           # Vercel Cron entry
        ai/tailor-cv/                # Claude → tailored CV
        ai/cover-letter/             # Claude → cover letter
        applications/                # tracker CRUD
        preferences/                 # prefs CRUD
        cv/upload/                   # paste-base-CV
        stripe/webhook/              # billing scaffold
    components/{ui,job,layout}
    lib/
      supabase/{server,client}.ts
      ai/{claude,cv}.ts
      ingestors/{greenhouse,lever,ashby,apify,adzuna,normalize,index}.ts
      billing/entitlements.ts
      types.ts
      utils.ts
  db/
    schema.sql                       # full Postgres schema + RLS
    seed/companies.json              # source companies for free ATS APIs
  scripts/run-ingestion.ts           # local one-shot ingestion
```

## Local setup

1. **Supabase project.** Create one at supabase.com. Open the SQL editor and run `db/schema.sql`. Create two storage buckets (`cvs`, `generated`) — both private.

2. **Env.** Copy `.env.example` → `.env.local` and fill in:

   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
   - `APIFY_TOKEN` (optional — board still works on free APIs only)
   - `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` (optional)
   - `CRON_SECRET` (any random string)

3. **Install + run.**
   ```bash
   cd job-finder
   npm install
   npm run dev    # http://localhost:3001
   ```

4. **Seed jobs.** Either wait for the scheduled cron in production, or run once locally:
   ```bash
   npm run ingest:once
   ```
   This calls Greenhouse/Lever/Ashby for every company in `db/seed/companies.json`, plus Apify and Adzuna if their tokens are set, deduplicates, and upserts into `jobs`.

## Production deploy (Vercel)

1. Connect this directory as a Vercel project (Root Directory: `job-finder`).
2. Add env vars in Vercel dashboard.
3. `vercel.json` already declares the daily 06:00 UTC cron at `/api/cron/refresh-jobs`. Vercel signs cron requests with a `Bearer` header — the route accepts that.

## Adding more companies

Edit `db/seed/companies.json`. Each entry needs the company's board token:

- **Greenhouse**: from their job board URL — e.g. `boards.greenhouse.io/monzo` → token `monzo`.
- **Lever**: e.g. `jobs.lever.co/spotify` → `spotify`.
- **Ashby**: e.g. `jobs.ashbyhq.com/lendable` → `lendable`.

Apify LinkedIn search terms / locations live in `src/lib/ingestors/index.ts`.

## Architectural notes

- **RLS-first.** Every table has `user_id` (or `id` for `profiles`) and a `auth.uid() = ...` policy. `jobs` and `job_tags` are public-read by design — they're not user data.
- **Generation cache.** Each AI call is keyed on `hash(baseCv | jobId | format)` and cached in `ai_generations`. Re-tailoring with the same inputs is free.
- **Cost ledger.** Every Claude call records `input_tokens`, `output_tokens`, and `cost_cents`. Roll up by `user_id` for per-user margins.
- **Entitlements.** `lib/billing/entitlements.ts` checks the user's plan_tier and current-month usage before each AI call. Returns 402 when over limit.
- **Source freshness.** All public ATS APIs return current postings; deletions handled by the `last_seen_at` column (jobs not seen for N days can be retired with a sweep query — left as a follow-up).

## Honest limits

- **You can't auto-submit applications** to LinkedIn/Greenhouse/Workday from a third-party app. The "Apply" flow tailors docs and opens the canonical posting in a new tab — that's the realistic ceiling. A browser extension for form autofill is a v2 idea.
- **Workday-based career sites** (HSBC, Lloyds, NatWest, etc.) don't expose a public API. Apify is the practical way in.
- **PDF parsing.** v1 takes pasted plain-text CVs. PDF parsing (with pdf-parse or unpdf) is in the v2 list.
