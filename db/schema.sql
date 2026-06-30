-- Stack Digest schema.
-- The whole scaling story lives in the shape of these tables: the expensive
-- work (ingesting + AI-rating an update) happens ONCE per entry, globally.
-- A user's digest is just a cheap filtered read over `entries`.

-- The tools we monitor (Anthropic, Vercel, Supabase, Clerk, OpenAI, Twilio...).
create table vendors (
  id          bigint generated always as identity primary key,
  slug        text not null unique,          -- 'anthropic', 'vercel'
  name        text not null,
  homepage    text,
  created_at  timestamptz not null default now()
);

-- Where each vendor's updates come from. One vendor can have several feeds
-- (changelog RSS, status page, releases API). Config-driven, not hardcoded.
create table feed_sources (
  id          bigint generated always as identity primary key,
  vendor_id   bigint not null references vendors(id) on delete cascade,
  kind        text not null,                 -- 'rss' | 'status' | 'releases'
  url         text not null,
  created_at  timestamptz not null default now()
);

-- One row per update we discover. `external_id` makes ingestion idempotent:
-- re-polling the same feed never creates duplicates. severity + why are filled
-- in ONCE by the AI step and reused for every one of the 100k users.
create table entries (
  id            bigint generated always as identity primary key,
  vendor_id     bigint not null references vendors(id) on delete cascade,
  external_id   text not null,               -- stable id/guid from the feed
  title         text not null,
  url           text,
  body          text,
  published_at  timestamptz not null,
  severity      text,                        -- 'red' | 'yellow' | 'green' (null = not yet rated)
  why           text,                        -- one-line "why it matters"
  created_at    timestamptz not null default now(),
  unique (vendor_id, external_id)
);
create index entries_published_idx on entries (published_at desc);
create index entries_vendor_published_idx on entries (vendor_id, published_at desc);

create table users (
  id          uuid primary key,              -- mirrors the Supabase auth user id
  email       text not null unique,
  plan        text not null default 'solo',  -- 'solo' | 'founder'
  unsubscribed_at timestamptz,               -- honoured on every send (GDPR)
  created_at  timestamptz not null default now()
);

-- Which vendors a user follows. THIS is the personalization — a digest is
-- "entries from vendors in my stack". Solo is capped at 5 (enforced in app code).
create table user_stacks (
  user_id     uuid not null references users(id) on delete cascade,
  vendor_id   bigint not null references vendors(id) on delete cascade,
  primary key (user_id, vendor_id)
);

-- Stripe billing, kept separate from the auth identity and linked by id.
create table subscriptions (
  user_id              uuid primary key references users(id) on delete cascade,
  stripe_customer_id   text not null,
  stripe_subscription_id text,
  status               text not null,        -- 'active' | 'past_due' | 'canceled'
  current_period_end   timestamptz
);

-- Send log. The unique key makes every send idempotent: a job that retries
-- can't double-email a user for the same day's digest.
create table deliveries (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references users(id) on delete cascade,
  kind        text not null,                 -- 'digest' | 'alert'
  dedupe_key  text not null,                 -- e.g. 'digest:2026-06-28' or 'alert:<entry_id>'
  sent_at     timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

-- Row-level security. The browser uses the anon client carrying the signed-in
-- user's JWT, so RLS is what stops anyone reading or editing someone else's
-- stack. Background jobs use the service-role key, which BYPASSES RLS — so
-- ingestion and the digest fan-out are unaffected by these policies.
alter table vendors enable row level security;
alter table entries enable row level security;
alter table users enable row level security;
alter table user_stacks enable row level security;
alter table subscriptions enable row level security;

-- vendors + entries are the public "menu" — readable by any client, never writable.
create policy "vendors readable" on vendors for select using (true);
create policy "entries readable" on entries for select using (true);

-- a user may read/write only their own row, their own stack, their own sub.
create policy "own user row" on users
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own stack" on user_stacks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own subscription" on subscriptions
  for select using (auth.uid() = user_id);
