# Pathway — session handoff

> Read this file at the start of any new Claude Code session for this project. It's the durable memory between sessions.

## What this is
A new standalone job-search app called **Pathway** (codename — rename later) being built in the wanderly repo. Lives entirely under `/job-finder/`. Wanderly (CRA app at repo root) and CertCoach are untouched and must stay that way.

## Branch
All work happens on `claude/job-board-app-G1epP`. Never push to `main` without explicit approval.

## User profile
- **Target roles:** Product Manager, AI Product Manager
- **Target location:** London, UK
- **They're using this for their own job hunt** — design for a real candidate, not a generic SaaS.

## Stack (decided)
- Next.js 14 App Router + TypeScript + Tailwind
- Supabase (Postgres + Auth magic-link + Storage)
- Anthropic Claude (Sonnet 4.6) via `@anthropic-ai/sdk`
- Stripe-ready webhook scaffolded for monetisation
- Vercel Cron for daily job ingestion
- Job ingestion sources: **Greenhouse + Lever + Ashby public APIs** (free, primary), Apify LinkedIn (optional, paid), Adzuna (optional)

## Current status (last commit `9afd6ba`)
- ✅ App scaffolded under `/job-finder/` — 51+ files
- ✅ Postgres schema with RLS on every user table (`db/schema.sql`)
- ✅ Free/Pro plan tiers + entitlement enforcement before AI calls
- ✅ Job ingestors for Greenhouse / Lever / Ashby / Apify / Adzuna with dedupe on `canonical_url`
- ✅ Cron route `/api/cron/refresh-jobs` (daily 06:00 UTC via `vercel.json`)
- ✅ AI routes `/api/ai/tailor-cv` (3 formats) + `/api/ai/cover-letter` (3 styles), generation cache by hash
- ✅ Application tracker (kanban: Saved / Applied / Interviewing / Offer / Rejected / Withdrawn)
- ✅ UI shell, sidebar, jobs board with filters, detail drawer, preferences page, sign-in (magic link)
- ✅ Stripe webhook scaffold
- ✅ TypeScript build passes (`npm run typecheck` clean, `npm run build` produces 17 routes)
- ✅ Pushed to `claude/job-board-app-G1epP`

## Pending work — pick up here

### Immediate next thing the user asked for
**Build a zero-setup standalone demo HTML** at `job-finder/public/demo.html` so the user can try the interactive board WITHOUT going through Phase 0 setup (no Supabase, no API keys, no `npm install`). Single self-contained file:
- Tailwind via CDN
- Vanilla JS
- ~30–45 real PM / AI PM London jobs baked in (verified canonical URLs from earlier WebSearches in conversation history — see "Verified jobs" below)
- Working: search, seniority + work-model filters, sort, click-to-detail drawer, Apply button opens canonical URL in new tab
- Static "AI tailoring preview" tab so they see the UX without needing a Claude key
- LocalStorage for save/applied tracking so the tracker concept also works

**Why it kept failing:** the user's client times out on long-running streaming responses. Recent turns ran `npm install` (60s) + `next build` (30s) + multiple parallel `WebSearch` calls and tripped the streaming timeout. Build the demo as **one compact Write call** then a separate commit+push turn. Don't run anything long-running.

### Verified jobs to bake into the demo (from earlier WebSearch results)
All have verified canonical URLs. Reasonable subset of ~35 jobs across:
- **OpenAI** — Product Manager, Integrity (London, 10+ yrs) — `https://openai.com/careers/product-manager-integrity-london-uk/`
- **Anthropic** — Product Manager, Claude Code; PM Claude Code (Enterprise); Product Operations Manager — at `https://anthropic.com/careers/jobs/4985920008`, `4858247008`, `4971429008`
- **BlackRock London** — VP Product Manager (`91586424896`), Senior PM, VP (`87545155664`), Associate Tech PM Liquidity & Financing (`93194402320`, posted Mar 25 2026), PM ETF Associate (`92337818688`, Mar 3 2026), Associate PM Aladdin (`91330832192`), Associate Technical PM (`91330832160`), PM Associate (`91373819392`), Tech PM Associate (`91453061936`), Associate PM (`91799089280`), Private Markets PM Associate (`88168028624`) — all under `https://careers.blackrock.com/job/london/...`
- **Stripe** — PM EMEA Payments Lead (`7768979`), PM Local Payment Methods EMEA (`7651697`), PM Payments Intelligence (`7580706`), PM Capital (`7721834`) — `https://stripe.com/jobs/listing/...`
- **Mistral AI** (Paris/London) — PM Mistral Vibe (`650e0e53-dc35-4e61-9b46-6f7ef003d0be`), PM Context & Search (`c08c3a0f-9899-4e6c-8195-8b1cc24c56ff`) — `https://jobs.lever.co/mistral/...`
- **Wise** — Senior PM, Wise Platform (Banks) — `https://wise.jobs/job/senior-product-manager-wise-platform-banks-in-london-jid-471`
- **Monzo** — Group PM (£115K–£145K) — `https://job-boards.greenhouse.io/monzo/jobs/6428865`
- **Revolut** — Credit PM (`939b28b6-87df-4ecb-b44c-4195be7687fc`), Product Strategy Manager (`b6d53c51-c29c-4f2e-90e8-a8eba158858e`) — `https://www.revolut.com/careers/position/...`
- **Lendable** — Senior PM (US Loans) — `https://jobs.ashbyhq.com/lendable/7237eaed-39e1-4f93-b6d8-8efd5af8c568`
- **Deel** — Principal PM FinTech (`99c6563a-a503-4f57-90cf-69122fb473c7`), Staff PM Fintech Client Experience (`a446c59c-83f8-4034-94e9-baa042884de6`) — `https://jobs.ashbyhq.com/deel/...`
- **Dataiku** — Senior PM (8 yrs) — `https://jobs.lever.co/dataiku/ee596a35-9f4c-4363-840f-81be3c363022`
- **Contentful** — Senior PM (`7635752`), Senior Product Operations Manager (`7752248`) — `https://job-boards.greenhouse.io/contentful/jobs/...`
- **Hudl** — Senior PM (4+ yrs hybrid) — `https://job-boards.greenhouse.io/hudl/jobs/7788853`
- **DataCamp** — Senior PM — `https://job-boards.greenhouse.io/datacamp/jobs/7275549`
- **Flo Health** — Senior PM (London/Vilnius) — `https://job-boards.greenhouse.io/flohealth/jobs/6227956003`
- **Octopus Money** — Senior Data PM (Holborn) — `https://job-boards.greenhouse.io/octopusmoney/jobs/5697566004`
- **Salary Finance** — PM (`6174177`), Lead Data PM (`5592361`) — `https://boards.greenhouse.io/salaryfinance/jobs/...`
- **SigTech** — PM — `https://boards.greenhouse.io/sigtech/jobs/4780801004`
- **Figma** — PM — `https://boards.greenhouse.io/figma/jobs/4709674004`
- **Spotify** — 2026 Summer Internship Business Strategy & PM (MBA) — `https://jobs.lever.co/spotify/35136842-6945-4571-b6a7-ff01b95be628`
- **Amazon** — Senior PM 12-month FTC Community Impact (`3057285`), Senior PM Transportation Services FTC (`3172601`) — `https://www.amazon.jobs/en/jobs/...`
- **Google** — Associate PM Early Careers 2026 Start (London) — `https://www.google.com/about/careers/applications/jobs/results/131566176474931910-associate-product-manager-early-careers-2026-start`
- **Microsoft** — AI Product Manager — `https://jobs.careers.microsoft.com/global/en/job/1610098/AI-Product-Manager`
- **B Lab** — Senior PM Certifications (London) — `https://job-boards.greenhouse.io/blab/jobs/8375619002`
- **Geckoboard** — PM (East London) — `https://jobs.lever.co/geckoboard/5d91d4f0-ccd8-4c83-9b79-dc13ff88c468`

### Known limitations (don't pretend otherwise)
- **Auto-applying** to LinkedIn/Greenhouse/Workday is technically not possible — no public API. The realistic flow is: tailor docs → open employer site → log to tracker. A browser extension for autofill is a v2 concept.
- **PDF parsing** is not yet wired — v1 takes pasted plain text. v2 should add `unpdf` (works on Vercel; `pdf-parse` does not).
- **PDF export** of the tailored CV not yet implemented — `@react-pdf/renderer` is in `package.json`, ready to use. This is the single highest-leverage next build (turns JSON into something a candidate actually downloads).
- **Workday-based banks** (HSBC/Lloyds/NatWest/Barclays) need Apify or a custom scraper — no public ATS API.

## Phased roadmap (already shared with the user)
- **Phase 0:** local setup (Supabase + env + run locally + smoke test) — ~30 min, user hasn't started yet, blocked on the demo first
- **Phase 1:** Vercel deploy
- **Phase 2:** PDF upload (`unpdf`) + PDF export (`@react-pdf/renderer`) — *highest UX value*
- **Phase 3:** Workday + bank coverage via Apify
- **Phase 4:** Stripe checkout activation
- **Phase 5:** Analytics (PostHog), email digests (Resend), public job pages for SEO
- **Phase 6 (v2):** Interview question gen + mock interview chat + voice mock interview

## Operational gotchas
- Build is currently passing — last commit `9afd6ba` fixed the TypeScript errors that broke Vercel auto-deploy (Supabase nested-join typing, cookie callback any, prefs annotation).
- The root `vercel.json` (CRA Wanderly) is unchanged. The new `job-finder/vercel.json` only declares the cron route. They don't conflict because Vercel projects are scoped by Root Directory.
- For the new app on Vercel, **Root Directory must be set to `job-finder`** in project settings — otherwise it builds the wrong package.json.
- `getServerSupabase` (uses `next/headers`) is in `lib/supabase/server.ts`. `getServiceSupabase` (no Next.js deps) is in `lib/supabase/service.ts`. Use the latter from CLI scripts and ingestors. Do not re-merge them.
- `db/seed/companies.json` is the curated list of company tokens for Greenhouse/Lever/Ashby ingestion. Add to it to expand coverage.

## Where things live
```
/job-finder/
  README.md                    full setup + architecture notes
  db/
    schema.sql                 idempotent Postgres schema with RLS
    seed/companies.json        Greenhouse/Lever/Ashby tokens
  src/
    app/
      page.tsx                 marketing landing
      (app)/                   signed-in shell — jobs, saved, applications, preferences, onboarding
      (auth)/sign-in/          magic-link sign-in
      api/                     cron, ai/*, applications, preferences, cv/upload, stripe/webhook
    components/{ui,job,layout}
    lib/
      supabase/{server,client,service}.ts
      ai/{claude,cv}.ts
      ingestors/{greenhouse,lever,ashby,apify,adzuna,normalize,index}.ts
      billing/entitlements.ts
      types.ts
      utils.ts
  scripts/run-ingestion.ts     `npm run ingest:once` to seed jobs locally
  vercel.json                  cron config
  .env.example                 every required env var
```

## Conversation style preferences (observed)
- The user wants forward motion, not back-and-forth. Surface decisions, recommend, then ship.
- Small turns are safer right now due to client streaming timeouts — keep tool calls minimal per turn.
- Honesty about what is/isn't possible matters more than impressive promises (they pushed back hard on "auto-apply" being unrealistic).
