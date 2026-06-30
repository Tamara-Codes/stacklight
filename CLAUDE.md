# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Stack Digest monitors a developer's AI/dev tool stack (Anthropic, Vercel, Supabase, Clerk, OpenAI, Twilio…) and emails them a daily digest of updates, each rated red / yellow / green. Two paid plans: Solo (€7/mo, capped at 5 tools) and Founder (€19/mo, unlimited).

Next.js 15 (App Router) + React 19 on Vercel, Supabase Postgres, Inngest for background jobs, Gemini for rating, Resend for email, Stripe for billing.

## Commands

```bash
npm run dev          # next dev
npm run build        # next build
npm run lint         # next lint
npm run db:push      # apply db/schema.sql to $DATABASE_URL via psql
npm run test:ingest  # run the content pipeline standalone (see below)
```

`test:ingest` needs env vars loaded into the shell first (it talks to Supabase + Gemini):

```bash
set -a; . ./.env; set +a; npm run test:ingest
```

There is no automated test suite — `scripts/test-ingest.ts` is a manual end-to-end check of the fetch → store → rate pipeline that prints results to the console. Use it to verify ingestion changes.

## The core scaling idea (read before touching the pipeline)

The whole design assumes ~100k users and keeps cost flat as users grow. The expensive work — fetching an update and AI-rating it — happens **ONCE per entry, globally**. A user's digest is just a cheap, filtered read over the shared `entries` table. Two rules follow from this:

- **Never rate per-user.** `rateEntry` (Gemini) is called only for entries where `severity is null`, in the ingest job. Don't move rating into the per-user digest path.
- **The daily send is fan-out, not a loop.** `dispatchDigests` (cron) finds eligible users and emits one `digest/user.requested` event each; `sendUserDigest` runs once per event with capped concurrency (50) and retries (3). If one user's send fails, only that job retries. Don't replace this with a single for-loop over all users.

## Idempotency (don't break these invariants)

Jobs retry, so several things are deliberately idempotent:

- `entries` has `unique (vendor_id, external_id)`; ingestion upserts with `ignoreDuplicates`, so re-polling a feed never duplicates.
- `deliveries` has `unique (user_id, dedupe_key)` (e.g. `digest:2026-06-28`). `sendUserDigest` checks this before sending and records after. The digest **date is computed once in `dispatchDigests` and passed down** in the event — so a retry hours later reuses the same dedupe key. Keep it that way.
- Inngest memoizes successful `step.run` blocks, so a retry of a later step won't re-run the send.

## Auth & security model

- **Two Supabase clients, never mix them:**
  - `lib/db/supabase.ts` — browser/anon client (publishable key). Used in client components for auth and RLS-guarded reads/writes.
  - `lib/db/admin.ts` — `supabaseAdmin`, service-role client (secret key). **Bypasses RLS.** Server/background only — never import into a client component or expose the key.
- **RLS is the authorization boundary** (`db/schema.sql`): `vendors`/`entries` are world-readable, never writable; a user can read/write only their own `users`, `user_stacks`, `subscriptions` rows. The browser does stack edits directly via the anon client (e.g. `app/stack/page.tsx`) and RLS is what makes that safe.
- **Background jobs use `supabaseAdmin`** and are intentionally unaffected by RLS.
- **API routes never trust a user id from the browser.** `/api/checkout` verifies the Supabase access token server-side via `supabaseAdmin.auth.getUser(token)`.
- **Stripe webhook** (`/api/stripe/webhook`) verifies the signature against the raw request body — it's the source of truth for who has paid, updating `subscriptions.status` and `users.plan`.
- **Unsubscribe** (`/api/unsubscribe`) must work without login, so the user id in the link is HMAC-signed (`lib/tokens.ts`); the route only acts if the signature verifies.
- The **Solo 5-tool cap is enforced in app code** (`SOLO_LIMIT` in `app/stack/page.tsx`), not in the DB.

## Layout

- `lib/feeds/sources.ts` — the vendor registry. **Adding a tool to monitor = adding an entry here**, not writing code. We pull official RSS/releases/status feeds; do NOT scrape HTML.
- `lib/inngest/functions/` — `ingest.ts` (poll feeds + rate, cron 06:00) and `digest.ts` (`dispatchDigests` cron 08:00 + `sendUserDigest` per-user). All functions must be registered in `app/api/inngest/route.ts` (the Inngest serve handler).
- `lib/ai/severity.ts` — Gemini rating. Model is the `MODEL` constant; uses a JSON response schema to force `{severity, why}`.
- `lib/email/digest.ts` — pure `buildDigestEmail` (inline styles, reds sorted first); `lib/email/client.ts` — Resend wrapper.
- `app/api/` — `checkout`, `stripe/webhook`, `unsubscribe`, `inngest` route handlers.
- `db/` — `schema.sql` (apply with `npm run db:push`), `seed-vendors.sql`. The `*-wonderpages*` file is unrelated leftover.
- `@/*` path alias maps to the repo root (see `tsconfig.json`).

## Notes

- `lib/db/node-ws.ts` polyfills `WebSocket` for supabase-js on Node < 22 (it eagerly builds a realtime client we never use). Imported only by the admin client; don't add it to browser/edge paths.
- This directory is **not a git repository**.
