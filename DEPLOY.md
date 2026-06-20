# Deploying to Vercel + Turso (with Google sign-in)

This app is multi-user: people sign in with Google and each gets their own private
question bank, history, and analytics. It runs on **Vercel** (hosting) + **Turso**
(hosted libSQL database). Below is the click-by-click setup. Budget ~20 minutes.

You'll collect these env vars along the way and paste them into Vercel at the end:

| Variable | From |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic console (you already have one) |
| `TURSO_DATABASE_URL` | Turso (step 1) |
| `TURSO_AUTH_TOKEN` | Turso (step 1) |
| `AUTH_SECRET` | generated (step 2) |
| `AUTH_GOOGLE_ID` | Google Cloud (step 3) |
| `AUTH_GOOGLE_SECRET` | Google Cloud (step 3) |
| `AUTH_URL` | your Vercel URL (step 5) |

---

## 1. Create the database (Turso)

1. Sign up at https://turso.tech (free tier is plenty).
2. Install the CLI and log in, then create a DB and a token:
   ```bash
   # macOS
   brew install tursodatabase/tap/turso
   turso auth login
   turso db create tnpsc
   turso db show tnpsc --url          # -> TURSO_DATABASE_URL  (libsql://...)
   turso db tokens create tnpsc       # -> TURSO_AUTH_TOKEN
   ```
   (No CLI? You can create the DB and token from the Turso web dashboard instead.)
3. Keep the URL and token. The app creates its tables automatically on first run.

## 2. Generate the auth secret

```bash
npx auth secret
```
Copy the value it prints → that's `AUTH_SECRET`. (Or any long random string.)

## 3. Create the Google sign-in app

1. Go to https://console.cloud.google.com → create/select a project.
2. **APIs & Services → OAuth consent screen** → choose **External** → fill app name +
   your email → Save. Under **Audience**, add your Google account (and any testers) as
   **Test users** (so only they can sign in while the app is in "testing").
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized redirect URIs** — add both:
     - `http://localhost:3000/api/auth/callback/google`  (local dev)
     - `https://YOUR-APP.vercel.app/api/auth/callback/google`  (fill in after step 5; you can edit this later)
4. Click Create → copy **Client ID** (`AUTH_GOOGLE_ID`) and **Client secret** (`AUTH_GOOGLE_SECRET`).

## 4. Push the code to GitHub

If it isn't already on GitHub, push this project to a repo (Vercel deploys from GitHub).

## 5. Deploy on Vercel

1. https://vercel.com → **Add New → Project** → import your GitHub repo.
2. Framework preset: **Next.js** (auto-detected). Don't deploy yet — first add env vars:
   **Settings → Environment Variables**, add all seven from the table above.
   - For `AUTH_URL`, use your Vercel URL. On the first deploy you may not know it yet;
     deploy once, copy the URL Vercel assigns (e.g. `https://tnpsc-xyz.vercel.app`),
     set `AUTH_URL` to it, then **redeploy**.
3. Go back to Google Cloud (step 3) and make sure the **redirect URI** uses your real
   Vercel URL: `https://YOUR-APP.vercel.app/api/auth/callback/google`.
4. **Deploy.** Open the URL → you should see the sign-in screen → "Continue with Google".

That's it — share the Vercel URL. Anyone you added as a Google **test user** can sign in
and gets their own private workspace.

---

## Notes & gotchas

- **Cost:** every signed-in user's quizzes/generation run on **your** `ANTHROPIC_API_KEY`,
  so your Anthropic bill scales with everyone's usage. The Google **test users** list is
  your access control — only people you add can sign in. (To open it to anyone, you'd
  "publish" the OAuth consent screen, which may require Google verification.)
- **Function timeouts:** Vercel's **Hobby** plan caps serverless functions at ~60s. A full
  200-question mock *with* web-grounded generation can exceed that on a cold bank. If a
  mock build times out, either upgrade to **Pro** (300s), turn the web-grounding toggle
  off, or build your bank first (ingest a PYQ paper / run smaller practice sets so
  questions get cached in the DB and the mock assembles from them quickly).
- **Local dev** still works with zero cloud setup: copy `.env.example` to `.env.local`,
  set `ANTHROPIC_API_KEY` + `AUTH_SECRET` + the Google vars, leave Turso vars unset (it
  falls back to a local `data/tnpsc.db` file), then `npm run dev`. Add
  `http://localhost:3000/api/auth/callback/google` to the Google redirect URIs.
- **Per-user data:** users share the global syllabus/taxonomy, but questions, sessions,
  attempts, and source docs are all scoped by `user_id` — nobody sees anyone else's data.
