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
  unsubscribed_at timestamptz,               -- honoured on every send (GDPR)
  created_at  timestamptz not null default now()
);
-- The product is free for everyone: no plans, no trial. Drop the old paid/trial
-- columns if this schema is applied to a database created before the switch.
-- (Idempotent: harmless on a fresh database.)
alter table users drop column if exists plan;
alter table users drop column if exists trial_ends_at;

-- Which vendors a user follows. THIS is the personalization — a digest is
-- "entries from vendors in my stack". Starter is capped at 10 (enforced in app code).
create table user_stacks (
  user_id     uuid not null references users(id) on delete cascade,
  vendor_id   bigint not null references vendors(id) on delete cascade,
  primary key (user_id, vendor_id)
);

-- The product is free for everyone — no billing. The old Stripe `subscriptions`
-- table was removed; drop it if this schema is applied to a database that still
-- has it. (Idempotent: harmless on a fresh database.)
drop table if exists subscriptions;

-- Which channels a user gets INSTANT red alerts on. One row per enabled
-- channel; the mere presence of a row means "this channel is on". The daily
-- digest email is separate (every user with access gets it) — these are the
-- extra real-time pings the moment a red lands. Written exclusively by the
-- /api/slack and /api/alerts routes via the service-role client — hence only a
-- select RLS policy below.
--   email:   target null (we send to users.email)
--   slack:   target = channel name (no '#'); account_id = Composio connected account id
--   discord: target = incoming webhook URL
create table alert_channels (
  user_id     uuid not null references users(id) on delete cascade,
  kind        text not null check (kind in ('email','slack','discord')),
  target      text,
  account_id  text,
  created_at  timestamptz not null default now(),
  primary key (user_id, kind)
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

-- Exactly which entries went into a delivery, so the Archive page can show the
-- literal digest that was sent instead of guessing from the user's current
-- stack (which may have changed since). Written alongside the deliveries row.
create table delivery_entries (
  delivery_id bigint not null references deliveries(id) on delete cascade,
  entry_id    bigint not null references entries(id) on delete cascade,
  primary key (delivery_id, entry_id)
);

-- Row-level security. The browser uses the anon client carrying the signed-in
-- user's JWT, so RLS is what stops anyone reading or editing someone else's
-- stack. Background jobs use the service-role key, which BYPASSES RLS — so
-- ingestion and the digest fan-out are unaffected by these policies.
alter table vendors enable row level security;
alter table entries enable row level security;
alter table users enable row level security;
alter table user_stacks enable row level security;
alter table feed_sources enable row level security;
alter table deliveries enable row level security;
alter table delivery_entries enable row level security;
alter table alert_channels enable row level security;

-- vendors + entries are the public "menu" — readable by any client, never writable.
create policy "vendors readable" on vendors for select using (true);
create policy "entries readable" on entries for select using (true);

-- a user may read/write only their own row and their own stack.
create policy "own user row" on users
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own stack" on user_stacks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own deliveries" on deliveries
  for select using (auth.uid() = user_id);
create policy "own delivery entries" on delivery_entries
  for select using (
    exists (select 1 from deliveries d where d.id = delivery_entries.delivery_id and d.user_id = auth.uid())
  );
create policy "own alert channels" on alert_channels
  for select using (auth.uid() = user_id);
