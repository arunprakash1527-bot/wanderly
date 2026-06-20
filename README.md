# TNPSC Group 1 Prelims Prep

A personal, single-user web app to prepare for the **TNPSC Group 1 Preliminary exam**. Chat to
configure a quiz (topic + difficulty + count, or a full 200-question mock), take it on a clean test
screen, and get scored results with explanations, category-level analytics, and AI study
recommendations. Questions are grounded in real previous-year questions (PYQs) you ingest, plus
optional source material.

> Scope (v1): Prelims only · English only · single user · local-first. See the build spec for the
> v2 backlog (Tamil bilingual, live current affairs, Mains module, hosted DB).

## Stack

- **Next.js 14 (App Router) + TypeScript** — UI and API routes in one app.
- **SQLite** via `better-sqlite3` (file at `data/tnpsc.db`). All DB access is behind `src/lib/db.ts`
  so swapping to a hosted libSQL/Turso DB later is a localized change.
- **Tailwind CSS** for a calm, exam-focused, keyboard-friendly UI.
- **Recharts** for analytics charts.
- **Anthropic Claude** (`@anthropic-ai/sdk`, default model `claude-sonnet-4-6`) for the five AI
  calls: intake parsing, PYQ extraction, question generation, explanations, and recommendations.
- **pdf-lib** for PDF result reports; CSV is built directly.

## Setup

1. **Install** dependencies:
   ```bash
   npm install
   ```
2. **Add your API key**. Copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY` (from
   https://console.anthropic.com). The app runs without a key, but AI features (extraction,
   generation, explanations, recommendations, smart chat parsing) are disabled and a simple offline
   parser is used instead.
3. **Initialise the database** (also happens automatically on first request):
   ```bash
   npm run seed            # schema + taxonomy
   npm run seed -- --demo  # also add a handful of sample questions to try quizzes immediately
   ```
4. **Run**:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

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
  app/                 # App Router pages + /api route handlers
  components/          # client React components (quiz runner, charts, forms…)
  lib/
    db.ts              # SQLite connection, schema, taxonomy seed (single DB module)
    types.ts           # shared domain types
    taxonomy.ts        # Section 8 taxonomy seed
    weights.ts         # full-mock composition (175 GS / 25 Aptitude) + marks
    repo.ts            # query helpers
    quiz.ts            # quiz builder (bank-first, generation top-up)
    generate.ts        # Track 2 generation
    scoring.ts         # submission + scoring
    analytics.ts       # category/subcategory/trend stats
    explain.ts         # on-demand explanation generation
    sources.ts         # source-document chunking + tagging
    export.ts          # CSV + PDF
    claude.ts          # Anthropic client + defensive JSON parsing
    prompts/           # all five Claude prompts (tunable)
scripts/seed.ts        # DB init + optional demo data
data/                  # SQLite DB + uploads (gitignored)
```

## Notes

- **Exam ground truth**: Prelims = 200 MCQs, 300 marks, 3 hours, 1.5 marks/correct, no negative
  marking, 175 GS (degree standard) + 25 Aptitude (SSLC standard). Prelims is qualifying/screening
  only — the app shows this but scores normally for practice value.
- **Deployment caveat**: SQLite is local-disk. To deploy (e.g. Vercel), swap `src/lib/db.ts` for a
  hosted libSQL/Turso client.
