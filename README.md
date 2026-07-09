# TNPSC Group 1 Prelims Prep

A **multi-user** web app to prepare for the **TNPSC Group 1 Preliminary exam**. Sign in with Google,
type what you want to be tested on (search-style — *"25 MCQs on Indian Polity"*) and answer a couple
of quick follow-ups (topic/subtopic · how many · Medium/Hard/Very hard), then take a scored quiz with
explanations, per-category analytics, and AI study recommendations. Each user gets a **private**
question bank, history, and analytics. Questions are AI-generated (optionally grounded in real
exam-style questions via web search) and/or built from previous-year papers (PYQs) you ingest.

> Hostable on Vercel + Turso. See **[DEPLOY.md](./DEPLOY.md)** for click-by-click deployment.

## Stack

- **Next.js 14 (App Router) + TypeScript** — UI and API routes in one app.
- **Turso / libSQL** (`@libsql/client`) — async, hosted-ready DB. Local dev falls back to a
  `data/tnpsc.db` file automatically. All DB access is behind `src/lib/db.ts`.
- **Auth.js v5 (NextAuth) + Google** — sign-in; every query is scoped per `user_id`.
- **Tailwind CSS** for a calm, exam-focused, keyboard-friendly UI.
- **Recharts** for analytics charts.
- **Anthropic Claude** (`@anthropic-ai/sdk`, default model `claude-sonnet-4-6`) for intake parsing,
  PYQ extraction, grounded question generation (with optional **web_search**), explanations, and
  recommendations.
- **pdf-lib** for PDF result reports; CSV is built directly.

## Local setup

1. **Install** dependencies:
   ```bash
   npm install
   ```
2. **Configure env**. Copy `.env.example` to `.env.local` and fill in:
   - `ANTHROPIC_API_KEY` (https://console.anthropic.com)
   - `AUTH_SECRET` — generate with `npx auth secret`
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — a Google OAuth web client (see DEPLOY.md step 3;
     add `http://localhost:3000/api/auth/callback/google` as a redirect URI)
   - Leave `TURSO_*` unset locally — the app uses a local `data/tnpsc.db` file.
   The schema + syllabus taxonomy are created automatically on first request.
3. **Run**:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000, sign in with Google, and start.

## Using it

- **Quiz** (home): type a request — _"Quiz me on Indian Polity, 10 medium questions"_,
  _"15 hard questions on Tamil Nadu history"_, or _"Full mock exam"_. Confirm the parsed config and
  start. The quiz screen has one-at-a-time questions, a palette, mark-for-review, a timer
  (count-down for mock, count-up for practice), and a **flag-as-wrong** control.
- **Ingest PYQs**: upload a previous-year paper PDF (and its official answer key). Claude extracts
  the questions verbatim; you review/correct category, answer and difficulty, then save to your
  **verified** bank. Questions without a confirmed answer are saved `unverified` and excluded from
  quizzes until fixed.
- **Sources**: optionally add recommended texts (TN State Board IX–XII, Laxmikanth, Ramesh Singh,
  Arihant) to ground AI-generated questions.
- **Results**: score (1.5/correct, no negative marking), breakdown, time, and a full review with
  explanations (generated on demand).
- **History / Analytics**: past sessions, per-category & per-subcategory accuracy, score trend,
  volume, and an AI study plan grounded strictly on your numbers.
- **Review flagged**: fix or delete questions you flagged as wrong.
- **Export**: CSV (per-attempt + summary) and a formatted PDF report per session.

## The two-track content engine

- **Track 1 — PYQ ingestion** (`/ingest`): the only way real past questions enter the bank. The AI
  extracts verbatim and never invents "real" PYQs; you are the verifier.
- **Track 2 — AI generation**: when a quiz needs more than the verified bank can supply, Claude
  generates new MCQs grounded on category PYQ exemplars + your source chunks + the syllabus blurb.
  Generated questions are `unverified`; flag-as-wrong removes them from rotation.

## Project layout

```
src/
  auth.ts              # Auth.js v5 config (Google) — edge-safe
  middleware.ts        # route protection
  app/                 # App Router pages + /api route handlers (+ signin, api/auth)
  components/          # client React components (search intake, quiz runner, charts…)
  lib/
    db.ts              # libSQL/Turso client, async schema + taxonomy seed, user upsert
    user.ts            # currentUser() / requireUserId() — resolves session -> user_id
    types.ts           # shared domain types
    taxonomy.ts        # syllabus taxonomy seed
    weights.ts         # full-mock composition (175 GS / 25 Aptitude) + marks
    repo.ts            # query helpers (async, user-scoped)
    quiz.ts            # quiz builder (bank-first, generation top-up)
    generate.ts        # Track 2 generation (optional web grounding)
    scoring.ts         # submission + scoring
    analytics.ts       # category/subcategory/trend stats
    explain.ts         # on-demand explanation generation
    sources.ts         # source-document chunking + tagging (in-memory, no disk)
    export.ts          # CSV + PDF
    claude.ts          # Anthropic client + web_search tool + defensive JSON parsing
    prompts/           # Claude prompts (tunable)
data/                  # local libSQL DB file in dev (gitignored)
```

## Notes

- **Exam ground truth**: Prelims = 200 MCQs, 300 marks, 3 hours, 1.5 marks/correct, no negative
  marking, 175 GS (degree standard) + 25 Aptitude (SSLC standard). Prelims is qualifying/screening
  only — the app shows this but scores normally for practice value.
- **Difficulty**: the DB models easy/medium/hard. The UI offers Medium / Hard / **Very hard**, where
  "Very hard" maps to the hard tier with a tougher-generation hint.
- **Hosting**: see [DEPLOY.md](./DEPLOY.md) for Vercel + Turso + Google OAuth.
