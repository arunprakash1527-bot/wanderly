# TNPSC Group 1 Prep — Session Handoff & Continuation Guide

> Paste this file (or attach it) at the start of a **new Claude Code session** that is
> scoped to the `tnpsc-group1-prep` repo. It captures everything needed to continue:
> repo access, current state, how to run, how to deploy, and the gotchas already hit.

---

## 0. First: scope the new session to the right repo

This project should live in **`arunprakash1527-bot/tnpsc-group1-prep`**. A Claude Code session
can only touch repositories on its allow-list, fixed when the session starts. To give the new
session access:

1. In **Claude Code on the web**, grant the Claude GitHub app access to
   `arunprakash1527-bot/tnpsc-group1-prep` (GitHub → Settings → Applications → the Claude app →
   Repository access → add this repo), then **start a new session selecting that repo**.
   Docs: https://code.claude.com/docs/en/claude-code-on-the-web (environments / sources / repos).
2. **Make sure the repo actually has the latest (v3) code first.** The newest code currently lives:
   - locally at `~/Downloads/tnpsc-group1-prep` (on the user's Mac), and
   - on GitHub in **`arunprakash1527-bot/wanderly`**, branch
     `claude/tnpsc-group1-prelims-app-uqapjf` (PR #12) — that branch's root *is* the full app.
   If `tnpsc-group1-prep` still only has the older v1, push the local code up before relying on it:
   ```bash
   cd ~/Downloads/tnpsc-group1-prep
   git add -A && git commit -m "v3: multi-user, Turso, search UI, polish" && git push
   ```

> Note for the new agent: you (the agent) cannot change the allow-list yourself; it's a
> user-side configuration applied at session creation.

---

## 1. What this is

A **multi-user web app** to prepare for the **TNPSC Group 1 Preliminary exam**. Users sign in with
Google; each gets a **private** question bank, quiz history, and analytics. They type a request
search-style ("25 MCQs on Indian Polity"), answer quick follow-ups (topic/subtopic · count ·
Medium/Hard/Very hard), take a scored quiz, and get explanations + per-topic analytics + an AI
study plan. Questions are AI-generated (optionally web-grounded) and/or ingested from real
previous-year papers (PYQs).

Exam ground truth: 200 MCQs, 300 marks, 3 hours, **1.5 marks/correct, no negative marking**,
175 General Studies + 25 Aptitude.

## 2. Tech stack

- **Next.js 14.2.35** (App Router) + **TypeScript**. (Do NOT upgrade to Next 16 — it breaks the
  app; see gotchas. Stay on 14.2.35.)
- **Turso / libSQL** (`@libsql/client`) — async DB. Local dev falls back to a `data/tnpsc.db` file
  if `TURSO_*` env vars are unset. All DB access is behind `src/lib/db.ts`.
- **Auth.js v5 (next-auth)** + **Google** sign-in. JWT sessions, no DB adapter. `src/auth.ts`,
  `src/middleware.ts`, `src/lib/user.ts` (resolves session → internal `user_id`).
- **Tailwind CSS**, **Recharts** (analytics), **pdf-lib** (PDF result export).
- **Anthropic Claude** (`@anthropic-ai/sdk`, model `claude-sonnet-4-6`) for: intake parsing, PYQ
  extraction, question generation (optional `web_search` grounding), explanations, recommendations.

## 3. Architecture / where things are

```
src/
  auth.ts, middleware.ts        # Google auth + route protection
  app/                          # App Router pages + /api routes + /signin + /api/auth
  components/                   # SearchIntake (home), QuizRunner, ResultsReview, charts, forms
  lib/
    db.ts                       # libSQL client, async schema+taxonomy seed, getOrCreateUserId
    user.ts                     # currentUser() / requireUserId()  (per-user scoping)
    repo.ts quiz.ts generate.ts scoring.ts analytics.ts explain.ts sources.ts export.ts
    claude.ts                   # Anthropic client + web_search tool + defensive JSON parsing
    prompts/index.ts            # all Claude prompts
DEPLOY.md                       # full Vercel + Turso + Google OAuth walkthrough (READ THIS to deploy)
README.md                       # overview + local setup
```
All user-owned rows (`questions`, `quiz_sessions`, `attempts`, `source_documents`, `source_chunks`)
carry `user_id`; categories/subcategories are global. Schema is created lazily on first DB call.

## 4. Environment variables (never commit; set in `.env.local` locally and in Vercel for prod)

| Var | What | Where to get it |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude API key (108 chars, starts `sk-ant-api03-`) | console.anthropic.com (account needs billing) |
| `TURSO_DATABASE_URL` | libSQL URL, e.g. `libsql://tnpsc-arunprakash1527-bot.aws-eu-west-1.turso.io` | turso.tech dashboard (not secret) |
| `TURSO_AUTH_TOKEN` | Turso token | Turso → database → Create Token |
| `AUTH_SECRET` | random string for Auth.js | `openssl rand -base64 33` |
| `AUTH_GOOGLE_ID` | Google OAuth client id (`...apps.googleusercontent.com`) | console.cloud.google.com → Credentials |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret (`GOCSPX-...`) | same |
| `AUTH_URL` (prod only) | deployed URL, e.g. `https://<app>.vercel.app` | after first Vercel deploy |

Google OAuth redirect URIs must include:
- `http://localhost:3000/api/auth/callback/google` (local)
- `https://<your-app>.vercel.app/api/auth/callback/google` (prod)

## 5. Run locally

```bash
npm install
# create .env.local with the vars above (TURSO_* optional locally -> uses a local file)
npm run dev    # http://localhost:3000  -> "Continue with Google"
```
Keep `npm run dev` running in its own terminal tab.

## 6. Deploy (the main remaining task)

Follow **`DEPLOY.md`** in the repo — it has click-by-click Vercel + Turso + Google steps. Summary:
1. Push the repo to GitHub (already there if step 0 done).
2. Vercel → Import the repo (Next.js auto-detected) → add all env vars from §4.
3. Deploy → copy the assigned URL → set `AUTH_URL` to it → add the prod Google redirect URI →
   redeploy.
4. Access control = Google "test users" list (only added emails can sign in). Note: every signed-in
   user's AI calls run on the owner's `ANTHROPIC_API_KEY`.
5. Vercel **Hobby** caps functions at ~60s — a 200-Q mock with web-grounding can time out; use Pro,
   or keep web-grounding off / build the bank first.

## 7. State: done vs. pending

**Done & verified locally:**
- Multi-user Google sign-in, per-user data isolation, Turso connected.
- Search-style intake + follow-ups; quiz → scoring (1.5/correct) → results review + explanations.
- Analytics, history, PYQ ingestion, source-doc grounding, PDF export.
- Web-grounded generation (bounded + **off by default**, labeled "slower").
- Polish: CSV export removed (PDF kept), nicer landing, wordmark "TNPSC Group 1".

**Pending / next steps:**
- [ ] Deploy to Vercel and get the shareable URL (main task — see §6 / DEPLOY.md).
- [ ] (Optional) Move/confirm the canonical repo is `tnpsc-group1-prep` (push from local if needed).
- [ ] (Optional) Further tighten or background web-grounding so it's Hobby-plan-safe.
- [ ] v2 backlog: Tamil bilingual, live current-affairs, Mains module, spaced repetition.

## 8. Gotchas already hit (save yourself the pain)

- **Never edit `.env.local` in TextEdit** — it injects smart quotes / hidden chars and corrupts the
  API key (symptom: `401 invalid x-api-key`, key length 110 not 108). Edit via terminal or a code
  editor in plain-text mode. A clean reset:
  ```bash
  read -rs K && printf 'ANTHROPIC_API_KEY=%s\n' "$(printf '%s' "$K" | tr -cd 'A-Za-z0-9_-')" >> .env.local; unset K
  ```
- **Unzip from the terminal** (`unzip -o file.zip`), not by double-clicking in Finder (Finder makes a
  separate `… 2` folder instead of updating the project).
- **zsh does NOT treat `#` as a comment** in pasted command lines — never include inline `# comments`
  in commands; they get parsed as arguments and break things.
- **Don't paste API keys/secrets into chat** — only into `.env.local` on the machine.
- **Keep `npm run dev` running**; `ERR_CONNECTION_REFUSED` just means it was stopped — restart it.
- **Do NOT run `npm audit fix --force`** — it upgrades to Next 16 and breaks the app. Stay on
  Next **14.2.35**. (The 2 npm audit warnings are acceptable for this app.)
- Anthropic key is **108 chars**, starts `sk-ant-api03-`. Turso token is a long JWT. Don't confuse
  the two when filling `.env.local`.

## 9. Suggested first message to the new session

> "This is the TNPSC Group 1 prep app (Next.js + Turso + Auth.js + Claude). The code is in this repo.
> Read DEPLOY.md and walk me through deploying to Vercel and getting a shareable URL. My env values
> are in my notes; don't ask me to paste secrets into chat."
