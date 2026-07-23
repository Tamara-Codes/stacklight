# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Stacklight monitors a developer's AI/dev tool stack (Anthropic, Vercel, Supabase, Clerk, OpenAI, Twilio…) and emails them a daily digest of updates, each rated red / yellow / green, plus instant red alerts by email / Slack / Discord. **The product is 100% free for everyone — no plans, no trial, no billing.**

**It's a newsletter, not an app with accounts.** There is NO login, NO password, NO OAuth, NO Supabase Auth. Subscribing = giving an email + picking a stack on the public `/subscribe` page (`POST /api/subscribe` creates the `users` row and `user_stacks`, then emails a welcome). A returning user manages their stack + alert channels on `/manage`, authenticated only by a **signed `(u, t)` token** in the URL — `t = HMAC(userId)` from `lib/tokens.ts` (`signUserId`/`verifyUserId`). Every email footer carries that signed manage link (`manageUrl()`), which is the only way back in. The same token gates unsubscribe. There's no access/plan gate at all: any user with a `users` row and no `unsubscribed_at` gets the digest (the fan-out filters on `unsubscribed_at` alone). (History: this was once a paid Starter/Full Stack Stripe model with a 14-day trial and Supabase-Auth accounts, gated by a `hasAccess`/`lib/plan.ts` helper; all of it was removed — see git history if paid/accounts ever need to come back.)

Next.js 15 (App Router) + React 19 on Vercel, Supabase Postgres, Inngest for background jobs, Gemini for rating, Resend for email, Composio for the Slack connection (OAuth + message sending).

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
- Red alerts dedupe the same way, **per channel**, with key `alert:<entry_id>:<channel>` (channel ∈ email/slack/discord) — both pollers may emit `alert/entry.red` for the same entry (that's expected), and the per-channel check in `sendUserRedAlert` stops a double ping while letting one channel retry without re-firing another that already sent.
- Inngest memoizes successful `step.run` blocks, so a retry of a later step won't re-run the send.

## Auth & security model

- **One Supabase client, server-only.** `lib/db/admin.ts` — `supabaseAdmin`, service-role client (secret key). **Bypasses RLS.** There is NO browser Supabase client anymore — the browser never touches the DB directly. Every DB read/write goes through a server route using `supabaseAdmin`. Never expose the secret key or import this into anything that ships to the browser.
- **Identity is a signed token, not a session.** No accounts/login. The user id is proven by `(u, t)` where `t = HMAC(userId)` (`lib/tokens.ts`). `/api/manage`, `/api/slack`, `/api/alerts`, and `/api/unsubscribe` all verify it the same way (`verifyUserId`) and act only on the matching user's rows. Never trust a bare `u` without a valid `t`.
- **`/api/subscribe` and `/api/vendors` are the only public routes.** Subscribe validates the email + vendor ids server-side (never trusts the client's numbers); vendors just lists the public monitorable set for the picker.
- **RLS is defense-in-depth, not the primary boundary.** `db/schema.sql` still has per-row policies, but since there's no browser client and no auth session (`auth.uid()` is always null), the anon path is effectively closed regardless. The real boundary is the signed token + service-role routes.
- **Background jobs use `supabaseAdmin`** too and are intentionally unaffected by RLS.
- **No tool cap.** The product is free and every user's stack is unlimited — there is no per-plan limit anywhere.

## Layout

- `lib/feeds/sources.ts` — the vendor registry. **Adding a tool to monitor = adding an entry here**, not writing code. We pull official RSS/releases/status feeds; do NOT scrape HTML.
- `lib/inngest/functions/` — `ingest.ts` (poll feeds + rate, cron 06:00), `digest.ts` (`dispatchDigests` cron 08:00 + `sendUserDigest` per-user), and `alerts.ts` (`dispatchRedAlert` per fresh red entry + `sendUserRedAlert` per user — same fan-out shape as the digest). `sendUserRedAlert` loops the user's enabled channels (`alert_channels`) and sends to each with its own dedupe/steps. All functions must be registered in `app/api/inngest/route.ts` (the Inngest serve handler).
- **Alert channels live in `alert_channels`** (one row per enabled channel, `kind` ∈ email/slack/discord; presence = on). email → `users.email`; slack → `target`=channel, `account_id`=Composio id; discord → `target`=incoming webhook URL. Select-only RLS; written only by `/api/slack` (slack) and `/api/alerts` (email/discord) via service-role.
- `lib/slack/composio.ts` — the only place that talks to Composio (OAuth link, connection lookup/delete, `SLACK_SEND_MESSAGE`). Server-only; tokens live in Composio, we store just `(account_id, channel)` in `alert_channels` (kind='slack'). Use `connectedAccounts.link()`, not the retired `initiate()`.
- `lib/discord/webhook.ts` — Discord red alerts via a user-supplied incoming webhook (`sendDiscordMessage`, `isDiscordWebhookUrl`). No OAuth, no Composio, no env key — the webhook URL is the credential, stored per-user in `alert_channels`.
- `lib/ai/severity.ts` — Gemini rating. Model is the `MODEL` constant; uses a JSON response schema to force `{severity, why}`.
- `lib/email/digest.ts` — pure `buildDigestEmail` (inline styles, reds sorted first); `lib/email/client.ts` — Resend wrapper.
- **Frontend pages:** `app/page.tsx` (public landing), `app/subscribe/page.tsx` (public funnel: pick stack → email → `POST /api/subscribe`), `app/manage/page.tsx` (returning users, token-authed via `?u=&t=` from the emailed link — edit stack + alert channels). `components/StackPicker.tsx` is the shared vendor-bubble picker used by both. No `(app)` route group / login shell anymore.
- `app/api/` — `vendors` (GET, public list for the picker), `subscribe` (POST, public signup), `manage` (GET/PUT stack, token-authed), `unsubscribe`, `inngest`, `slack` (connect/status/channel/disconnect; GET doubles as the OAuth callback by adopting the ACTIVE Composio connection; callback returns to `/manage` carrying the token), `alerts` (GET/PUT/DELETE email + Discord channels). All user routes authenticate with the signed `(u, t)` token.
- `db/` — `schema.sql` (apply with `npm run db:push`), `seed-vendors.sql`. The `*-wonderpages*` file is unrelated leftover.
- `@/*` path alias maps to the repo root (see `tsconfig.json`).

## Notes

- `lib/db/node-ws.ts` polyfills `WebSocket` for supabase-js on Node < 22 (it eagerly builds a realtime client we never use). Imported only by the admin client; don't add it to browser/edge paths.
- This directory is **not a git repository**.
