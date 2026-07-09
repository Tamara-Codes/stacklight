// Feed-item → DB row mapping, in ONE place so the ingest job and the standalone
// test script can't drift apart (they used to duplicate this logic).

export interface EntryRow {
  vendor_id: number;
  external_id: string;
  title: string;
  url: string | null;
  body: string | null;
  published_at: string;
}

// Some feeds emit malformed or absurd dates — Stripe's status feed once sent
// year 58266, which Postgres rejects as out of range and that fails the whole
// insert batch. Coerce anything unparseable or outside a sane window to "now".
// We allow ~1 year ahead because scheduled-maintenance items are legitimately
// future-dated.
export function safePublishedAt(raw?: string | null): string {
  const now = Date.now();
  const t = raw ? Date.parse(raw) : NaN;
  const min = Date.parse("2000-01-01T00:00:00Z");
  const max = now + 366 * 24 * 60 * 60 * 1000;
  if (!Number.isFinite(t) || t < min || t > max) return new Date(now).toISOString();
  return new Date(t).toISOString();
}

// The rss-parser fields we read. Parser.Item types most of these, but `guid`
// only appears via its catch-all index signature, so we pin the shape here.
export interface FeedItem {
  guid?: string;
  link?: string;
  title?: string;
  content?: string;
  contentSnippet?: string;
  isoDate?: string;
}

// Map a parsed feed item to an entries row. Returns null when there's no stable
// id to dedupe on — without one, every poll would insert a fresh duplicate.
export function toEntryRow(vendorId: number, item: FeedItem): EntryRow | null {
  const externalId = item.guid ?? item.link ?? item.title ?? "";
  if (!externalId) return null;
  return {
    vendor_id: vendorId,
    external_id: externalId,
    title: item.title ?? "(untitled)",
    url: item.link ?? null,
    body: item.contentSnippet ?? item.content ?? null,
    published_at: safePublishedAt(item.isoDate),
  };
}
