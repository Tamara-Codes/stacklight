# Stacklight

Stacklight watches your AI/dev tool stack — Anthropic, Vercel, Supabase, OpenAI, Stripe, Cloudflare, and 40+ others — and emails you **one daily digest** rating every update 🔴 red / 🟡 yellow / 🟢 green. When a **red** lands (an outage, a breaking change, a dated deprecation), it also pings you instantly over **email, Slack, or Discord**.

**Free for everyone. No account, no password, no card.** Pick your tools, drop your email, done.

## How it works

1. **Pick your stack** — choose from the supported vendors on `/subscribe`.
2. **We watch, so you don't** — every morning a job polls each vendor's official **status page, changelog, and GitHub releases** (official feeds only, never scraped) and rates each new update with an LLM.
3. **Read one email** — a daily digest, reds first. Reds also fire an instant alert to whichever channels you turned on.

There's no login. A returning user manages their stack and alert channels on `/manage`, authenticated by a signed token carried in every email — the same token that powers one-click unsubscribe.

## Architecture (why it stays cheap at scale)

The design assumes it should cost roughly the same at 100 users as at 100,000:

- **Rate once, globally.** The expensive step — AI-rating an update — happens **once per entry**, when it's ingested, not once per subscriber. A user's digest is then a cheap filtered read over the shared `entries` table.
- **Fan-out, not a loop.** A cron finds eligible users and emits one event per user; [Inngest](https://www.inngest.com) runs the sends as thousands of isolated, retryable jobs. One user's failure retries alone.
- **Idempotent by construction.** Dedupe keys on `deliveries` (per user/day for digests, per entry/channel for alerts) mean a retry can never double-send.

## Stack

- **Next.js 15** (App Router) + **React 19**, hosted on **Vercel**
- **Supabase** (Postgres) — all access server-side via the service-role client
- **Inngest** — cron + background job orchestration
- **Gemini** — rates each update's severity
- **Resend** — transactional email
- **Composio** — Slack connection (OAuth); Discord is a plain incoming webhook

## Local development

```bash
npm install
npm run dev          # next dev
npm run build        # next build
npm run lint         # next lint
npm run db:push      # apply db/schema.sql to $DATABASE_URL via psql
npm run test:ingest  # run the fetch → store → rate pipeline standalone
```

`test:ingest` needs env vars loaded into the shell first:

```bash
set -a; . ./.env; set +a; npm run test:ingest
```

Copy `.env.example` to `.env` and fill it in (Supabase, Gemini, Resend, Inngest, and — only if you want Slack alerts — Composio).

## Layout

- `lib/feeds/sources.ts` — the vendor registry. **Adding a tool = adding an entry here**, not writing code.
- `lib/inngest/functions/` — `ingest.ts` (poll + rate), `digest.ts` (daily digest fan-out), `alerts.ts` (instant red-alert fan-out).
- `lib/ai/severity.ts` — Gemini rating. `lib/email/` — digest/alert/welcome builders + Resend client.
- `app/subscribe` — the signup funnel. `app/manage` — token-authed stack + alert-channel management.
- `db/schema.sql` — the database schema (apply with `npm run db:push`).

## Deployment

Deploys to `stacklight.nosastra.co` on Vercel. Env vars live in the Vercel project; Inngest syncs the cron/event functions against the deployed `/api/inngest` endpoint.

---

Made by [Tamara](https://tamara.rocks) · [@CodeWithTamara](https://x.com/CodeWithTamara) · [LinkedIn](https://www.linkedin.com/in/tamaracodes) · codewithtamara@gmail.com
