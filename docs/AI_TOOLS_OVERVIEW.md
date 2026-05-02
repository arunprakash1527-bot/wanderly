# AI-Built Tools — Overview

A short brief on three tools I've built using AI-assisted development:
**OpenClaw on WhatsApp**, **TripWithMe**, and **Perplio / CertCoach**. For each
I cover the *what*, the *why*, and the *how* — and for the two product plays I
also size the market.

---

## 1. OpenClaw on WhatsApp — my personal digital assistant

### What
A WhatsApp chat that fronts an LLM (OpenClaw) so I can talk to my assistant
the same way I message anyone else — from my phone lock screen, my watch,
desktop WhatsApp, or hands-free in the car. No new app to open, no separate
login, no context switch.

### Why
- The friction of opening a chatbot app, signing in, and waiting for a UI to
  load was killing the "ask in the moment" use case.
- WhatsApp is already where I send notes-to-self, forward links, and dictate
  voice memos — so it's the natural inbox for an assistant.
- I wanted one assistant available across every device I already own without
  installing anything new.

### How (set-up)
- **Channel:** WhatsApp Business API (via a provider like Twilio / Meta Cloud
  API) wired to a small webhook endpoint.
- **Brain:** OpenClaw routes the message to the LLM with a system prompt that
  encodes my preferences, time zone, and shortcut commands.
- **Memory & context:** lightweight per-thread memory so follow-ups
  ("summarise that", "make it shorter") work without re-pasting context.
- **Multimodal:** voice notes are transcribed before being sent to the model;
  forwarded images / PDFs are OCR'd or parsed; links are fetched and
  summarised.
- **Tools:** the assistant can call out to a small set of helpers — web
  search, calendar lookup, a "save to notes" sink, and a "remind me" timer.

### How I actually use it
- **Capture:** forward a tweet, article, or YouTube link → ask for a 5-bullet
  summary.
- **Voice-first:** dictate a voice note while walking → get back a structured
  to-do list or an email draft.
- **Translation on the fly:** paste a message in another language, get it
  translated and a suggested reply in my voice.
- **Quick research:** "What's a fair price for X in Bangalore right now?" or
  "Compare these two travel insurance policies."
- **Planning brain-dumps:** ramble for a paragraph, get back a clean outline
  I can act on.
- **Meal/Recipe helper:** snap a photo of what's in the fridge → get a
  recipe; convert units; scale the recipe for 4 people.
- **Travel lookups:** flight rules, visa requirements, currency conversions
  while I'm on the move.

It's effectively replaced 80% of my Google searches and most of my
"open ChatGPT app" moments.

---

## 2. TripWithMe — group trip planning, made calm

### What
A mobile-first web app for planning and living through trips *with other
people*. It bundles the things group travel actually needs into one place:
shared itinerary, group chat, expenses split, photo memories / "reels", a
post-trip "Trip Wrapped" recap, and AI-assisted suggestions (places to eat,
EV chargers on route, weather-aware day plans, directions).

### Why
Group travel today is 6 apps duct-taped together: WhatsApp for chat,
Splitwise for money, Google Docs for the itinerary, Google Maps for routing,
Google Photos for the album, and someone's Notes app for the master plan.
Things fall through the cracks, the "trip context" lives nowhere, and the
memories die in a camera roll. TripWithMe collapses all of that into one
shared trip surface.

### How (tech set-up)
- **Frontend:** React 18 single-page app (`src/wanderly-app.jsx`) with a
  provider-composition architecture — Auth, Navigation, Trip, Wizard, Chat,
  Expense, Memories contexts.
- **Backend-as-a-service:** Supabase for auth, Postgres, row-level security
  (`supabase-rls-lockdown.sql`), and storage. Schema is versioned in
  `supabase-schema-v2.sql`.
- **Edge / API layer:** lightweight serverless functions in `/api` for the
  things the client shouldn't do directly — `chat.js` (LLM proxy),
  `places.js`, `geocode.js`, `directions.js`, `weather.js`, `currency.js`,
  `ev-chargers.js`, `place-photo.js`, `og-preview.js`, `enrich.js`.
- **AI features:** the chat endpoint wraps an LLM with trip context (dates,
  destination, party size, preferences) so suggestions are grounded in the
  actual trip.
- **Hosting:** Vercel (`vercel.json`).
- **Quality:** Playwright end-to-end tests in `/e2e`, plus an in-app
  ErrorBoundary and a service worker for offline-friendly behavior.
- **PWA:** installable, service-worker cached so it behaves like a native app
  without an app-store release.

### Market — does one exist, and how big?
Yes, and it's enormous, but fragmented:

- **Online travel market:** ~US $600–700 B in 2024, projected to cross
  US $1 T by the early 2030s.
- **Travel app / mobile travel booking segment specifically:**
  ~US $370 B in 2024, growing low-double-digit % CAGR.
- **Trip-planning + itinerary software (the slice TripWithMe sits in):**
  estimates put it in the US $10–15 B range today, growing ~10–13% CAGR as
  AI-assisted planning takes share from manual research.
- **Expense-splitting (a feature TripWithMe absorbs):** Splitwise alone has
  tens of millions of MAUs — proof users will install a dedicated app *just*
  for one slice of the trip workflow.

Direct comps: Wanderlog, TripIt, Polarsteps, Roam Around, Layla, Mindtrip.
None of them combine **planning + group chat + expenses + memories** in a
single shared trip surface — that's the wedge.

---

## 3. Perplio / CertCoach — AI coach for professional certifications

### What
An AI study companion for people preparing for professional certifications
(cloud, security, PM, finance, etc.). Two halves working together:
- **Perplio** — a Perplexity-style answer engine grounded in the official
  exam syllabus, so questions get cited, syllabus-aligned answers instead of
  generic web results.
- **CertCoach** — a coach layer on top: adaptive practice questions, spaced
  repetition, weak-area diagnostics, mock exams, and a study plan that bends
  to your test date.

### Why
Cert prep today is a painful mix of expensive courses, stale PDF dumps, and
forum threads of unknown accuracy. Learners want three things: *"explain this
the way I'd understand it"*, *"quiz me on what I'm weakest at"*, and
*"tell me if I'm ready"*. LLMs can do all three — but only if they're
grounded in the real syllabus and exam style, otherwise they hallucinate
question formats and pass rates. Perplio + CertCoach is that grounded layer.

### How (tech set-up)
- **Knowledge base:** per-certification corpus (official guides, whitepapers,
  exam blueprints) chunked and embedded into a vector store.
- **Retrieval:** hybrid retrieval (vector + keyword) → reranker → LLM, so
  every answer is citation-backed and traceable to a syllabus section.
- **Question generation:** the model generates practice questions in the
  exact style/format of the target exam, validated against the blueprint.
- **Adaptive engine:** a lightweight learner model (which topics you've
  mastered, which you keep missing) drives what gets surfaced next; spaced
  repetition for retention.
- **Coach loop:** mock exam → diagnostic report → updated study plan →
  daily/weekly nudges.
- **Stack:** web app + LLM provider for generation, vector DB for retrieval,
  Postgres for user state and progress, auth and billing on top.

### Market — does one exist, and how big?
Yes, and it's growing fast on the back of AI-native learning:

- **Global IT certification market:** ~US $13–15 B in 2024, projected to
  reach US $25–30 B by the early 2030s (~7–10% CAGR).
- **Broader test-prep market** (incl. professional certs, finance,
  healthcare, language, K-12 admissions): ~US $28 B in 2024, projected to
  cross US $55 B by 2032.
- **Corporate e-learning** (the B2B angle — selling CertCoach to employers
  who reimburse certs): ~US $400 B+ and growing low-teens % CAGR.
- **AI-in-education sub-segment:** ~US $5–6 B in 2024 with 35–45% CAGR — the
  fastest-growing slice and exactly where Perplio/CertCoach sits.

Direct comps: Coursera/Udemy (broad, not exam-specific), Pocket Prep / UWorld
/ Magoosh (exam-specific but pre-AI), Whizlabs, Tutor by ChatGPT (generic).
The opening: a coach that's *grounded* in a specific exam, *adaptive* to the
individual, and *cheap enough* to undercut the US $300–600 prep courses
that dominate today.

---

## TL;DR

| Tool | Audience | Wedge | Market |
| --- | --- | --- | --- |
| **OpenClaw on WhatsApp** | Me | Zero-friction assistant in the app I already live in | Personal |
| **TripWithMe** | Groups planning trips together | One shared trip surface vs. 6 apps duct-taped | ~US $10–15 B trip-planning slice of a US $1 T travel market |
| **Perplio / CertCoach** | Professionals prepping for certs | Grounded, adaptive AI coach vs. generic LLMs and stale PDFs | ~US $13–15 B cert market inside a US $400 B+ corporate learning market |
