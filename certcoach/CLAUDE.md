# CLAUDE.md — Build Spec: "CertCoach" (working title)

> **For Claude Code:** This file is the project brief. Read it fully before writing code.
> Build the MVP defined in Section 7 first. Do not build Phase 2+ features until the MVP runs end-to-end.
> Ask me (the user) before making irreversible decisions (deleting data, changing the schema after data exists, picking a paid service).

-----

## 1. What this app is

An **AI-powered certification study companion**. It helps someone preparing for a structured
professional exam (e.g. PRMIA ORM Designation, CFA, PMP, FRM, AWS certs) turn a messy pile of
sources — handbooks, personal notes, screenshots, scanned book pages — into a **chapter-by-chapter
coached path to exam readiness**, with practice questions **modelled on the real exam's style**.

**It is NOT a generic "upload PDF → get quiz" tool.** Many of those exist (Quizgecko, StudyX,
Mindgrasp, StudyPDF). The wedge here is:

1. **Structured exams** — an exam has parts and chapters; everything hangs off that structure.
1. **Style-matched questions** — the user captures REAL sample/mock questions; the AI mirrors
   their phrasing, scenario-vs-recall balance, and distractor patterns when generating new MCQs.
1. **Readiness analytics** — progress, weak spots, strong spots, and an overall readiness score,
   broken down by chapter and by exam.

## 2. Who it's for

The primary user is a working professional self-studying for a high-stakes certification, who
currently has to juggle many disconnected sources. Secondary: their friends/colleagues studying
the same cert (sharing is a core growth loop). First real user/tester: the app owner, prepping
for PRMIA ORM Part 1 and Part 2.

## 3. Core principles for the build

- **Generic by design.** Nothing should be hardcoded to PRMIA/ORM. "Add a new exam" must work
  for any certification. Test this by seeding TWO different exams (ORM + one other, e.g. PMP).
- **Boring, reliable stack.** Favour well-documented mainstream tools over clever ones.
- **Ship the thin slice.** The MVP (Section 7) must run end-to-end before anything else.
- **AI calls are the cost centre.** Meter and cap them from day one (see Section 8).
- **Mobile-friendly web first.** Responsive web app. Native iOS/Android comes much later.

## 4. Recommended tech stack

- **Frontend:** React + Vite + TypeScript. Tailwind CSS for styling. React Router.
- **Backend / DB / Auth / Storage:** Supabase (Postgres + Auth + Storage in one). Use Row Level
  Security so users only ever see their own data.
- **AI:** Anthropic Claude API (`@anthropic-ai/sdk`). Used for: (a) extracting/structuring text
  from uploaded materials, (b) chapter coaching summaries, (c) MCQ generation, (d) explanations.
- **OCR for scans/screenshots:** Claude's vision capability can read images directly.
- **PDF text extraction:** `pdf-parse` or `pdfjs-dist` client-side for text PDFs.
- **Hosting:** Vercel or Netlify for the frontend; Supabase is hosted.

## 5. Data model

Build these tables in Supabase. All tables have `id` (uuid), `created_at`, `updated_at`.
All user-owned rows have `user_id` and an RLS policy restricting access to the owner.

## 6. Key screens

1. Dashboard / My Exams
2. Add Exam
3. Exam Detail
4. Chapter Detail
5. Upload Materials
6. Capture Sample Questions
7. Quiz Runner
8. Readiness / Insights

## 7. MVP — BUILD THIS FIRST

Ship a working end-to-end slice for one user, one exam, no sharing, no payments.

## 8. AI usage, cost control, and prompt design

Wrap every Claude call in a single `callClaude()` helper. Track generations per user per month.

## 9. Monetization

Model: freemium + subscription. Implement `subscription_tier` + `usage` counter + feature-gate checks NOW.
