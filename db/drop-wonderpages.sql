-- ONE-TIME: clear the Wonder Pages tables out of this (now shared) Supabase
-- project so Stack Digest starts clean. Data was backed up first to
-- ~/wonder-pages/db-backup-2026-06-28/ (order_requests + coloring_catalog).
-- Run this, THEN run schema.sql.
--
-- (The `pages` storage bucket is left alone — it holds Wonder Pages artwork and
--  isn't a table; delete it separately from the Supabase Storage UI if you want.)
drop table if exists public.order_requests cascade;
drop table if exists public.coloring_catalog cascade;
