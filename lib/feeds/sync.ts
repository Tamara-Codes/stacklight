// Shared fetch → diff → store logic for one vendor feed, used by the daily
// ingest cron, the frequent status poller, and scripts/test-ingest.ts so the
// three can't drift apart.
//
// Why diff instead of `ignoreDuplicates`: Statuspage feeds UPDATE the same item
// as an incident evolves (Investigating → Identified → Resolved). Keeping only
// the first-seen version froze incidents at "happening RIGHT NOW" forever. Now
// a changed item is re-stored with severity/why nulled, which puts it back in
// the rate-unrated queue — where a resolved incident becomes "skip" and drops
// out of digests. Server/background only (imports supabaseAdmin).
import Parser from "rss-parser";
import { supabaseAdmin } from "@/lib/db/admin";
import { toEntryRow, type EntryRow } from "@/lib/feeds/normalize";
import type { FeedSource, VendorDef } from "@/lib/feeds/sources";
import { rateEntry } from "@/lib/ai/severity";
import { fetchPageContent } from "@/lib/ai/enrich";

// One parser for all callers. Vendors' CDNs occasionally hang instead of
// erroring — without a timeout one dead feed stalls the whole ingest run.
export const feedParser = new Parser({ timeout: 15000 });

export async function upsertVendor(vendor: VendorDef): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("vendors")
    .upsert(
      { slug: vendor.slug, name: vendor.name, homepage: vendor.homepage },
      { onConflict: "slug" }
    )
    .select("id")
    .single();
  if (error || !data) throw new Error(`vendor upsert failed for ${vendor.slug}: ${error?.message}`);
  return data.id as number;
}

export interface SyncResult {
  inserted: number;
  updated: number;
}

// Order-insensitive body comparison. Some status feeds (e.g. E2B) shuffle the
// "affected components" list on every fetch — an exact compare saw a phantom
// change each poll and would have re-rated the same incident forever. Sorting
// lines keeps real updates (a new "Resolved - …" line) detectable while
// ignoring pure reordering.
function bodyFingerprint(body: string | null | undefined): string {
  if (!body) return "";
  return body
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .sort()
    .join("\n");
}

// Fetch one feed and reconcile it with the entries table. Feeds are newest-
// first; the cap keeps a huge archive feed (OpenAI's news RSS carries 1000+
// items) from flooding the rating queue on first sync — we only ever want the
// recent window anyway.
export async function syncVendorFeed(
  vendorId: number,
  feed: FeedSource,
  opts?: { maxItems?: number }
): Promise<SyncResult> {
  const parsed = await feedParser.parseURL(feed.url);
  const items = parsed.items.slice(0, opts?.maxItems ?? 50);
  const rows = items
    .map((item) => toEntryRow(vendorId, item))
    .filter((r): r is EntryRow => r !== null);
  if (!rows.length) return { inserted: 0, updated: 0 };

  const { data: existing } = await supabaseAdmin
    .from("entries")
    .select("external_id, title, body")
    .eq("vendor_id", vendorId)
    .in("external_id", rows.map((r) => r.external_id));
  const byId = new Map((existing ?? []).map((e) => [e.external_id as string, e]));

  const fresh = rows.filter((r) => !byId.has(r.external_id));
  const changed = rows.filter((r) => {
    const e = byId.get(r.external_id);
    return (
      e &&
      (e.title !== r.title || bodyFingerprint(e.body) !== bodyFingerprint(r.body))
    );
  });

  // New items: ignoreDuplicates keeps this race-safe when two runs overlap.
  if (fresh.length) {
    const { error } = await supabaseAdmin
      .from("entries")
      .upsert(fresh, { onConflict: "vendor_id,external_id", ignoreDuplicates: true });
    if (error) throw error;
  }

  // Changed items: overwrite content and null the rating so it's re-rated.
  if (changed.length) {
    const { error } = await supabaseAdmin
      .from("entries")
      .upsert(
        changed.map((r) => ({ ...r, severity: null, why: null })),
        { onConflict: "vendor_id,external_id" }
      );
    if (error) throw error;
  }

  return { inserted: fresh.length, updated: changed.length };
}

// Rate everything with severity null, in batches, until drained or `max` is
// hit. Called after every sync (daily ingest AND the frequent poller) — an
// entry is still only ever rated when its severity is null, so the once-per-
// entry-globally cost model is unchanged.
//
// `redIds` reports which entries came out red in THIS run, so callers can fan
// out instant Slack alerts for exactly the fresh reds — without a rated_at
// column or a second query that could race with the next poll.
export interface RateResult {
  rated: number;
  redIds: number[];
}

export async function rateUnratedEntries(max = 500): Promise<RateResult> {
  let rated = 0;
  const redIds: number[] = [];
  while (rated < max) {
    const { data: unrated } = await supabaseAdmin
      .from("entries")
      .select("id, title, body, url, vendors(name)")
      .is("severity", null)
      .limit(Math.min(100, max - rated));
    if (!unrated?.length) break;

    // supabase-js can't infer the vendors(name) join without generated DB types.
    const rows = unrated as unknown as {
      id: number;
      title: string;
      body: string | null;
      url: string | null;
      vendors: { name: string } | null;
    }[];

    for (const entry of rows) {
      const vendorName = entry.vendors?.name ?? "Unknown";

      // Thin snippet + a link: rate the real page, not the teaser. Happens at
      // most once per entry (rating is once per entry), so cost stays flat —
      // and a failed fetch just falls back to the snippet.
      let body = entry.body;
      if ((body ?? "").length < 200 && entry.url) {
        body = (await fetchPageContent(entry.url)) ?? body;
      }

      const rating = await rateEntry({
        vendor: vendorName,
        title: entry.title,
        body,
      });
      await supabaseAdmin
        .from("entries")
        .update({ severity: rating.severity, why: rating.why })
        .eq("id", entry.id);
      if (rating.severity === "red") redIds.push(entry.id);
      rated++;
    }
  }
  return { rated, redIds };
}
