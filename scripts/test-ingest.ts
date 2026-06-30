// One-off test of the content pipeline: fetch every vendor feed, store new
// entries, then rate the unrated ones with Gemini. Mirrors what the Inngest
// ingest function does, but runnable standalone so we can see it work.
// Run: set -a; . ./.env; set +a; npm run test:ingest
import Parser from "rss-parser";
import { VENDORS } from "../lib/feeds/sources";
import { toEntryRow, type EntryRow } from "../lib/feeds/normalize";
import { supabaseAdmin } from "../lib/db/admin";
import { rateEntry } from "../lib/ai/severity";

const parser = new Parser();
const dot = (s: string) =>
  s === "red" ? "🔴" : s === "yellow" ? "🟡" : s === "green" ? "🟢" : "⚫"; // ⚫ = skip (dropped from digest)

async function main() {
  console.log("── Fetching feeds ──");
  for (const vendor of VENDORS) {
    const { data: v, error: vErr } = await supabaseAdmin
      .from("vendors")
      .upsert({ slug: vendor.slug, name: vendor.name, homepage: vendor.homepage }, { onConflict: "slug" })
      .select("id")
      .single();
    if (vErr || !v) {
      console.log(`  ✗ ${vendor.name}: vendor upsert failed — ${vErr?.message}`);
      continue;
    }
    const vendorId = v.id as number;

    for (const feed of vendor.feeds) {
      try {
        const parsed = await parser.parseURL(feed.url);
        const rows = parsed.items
          .slice(0, 10)
          .map((item) => toEntryRow(vendorId, item))
          .filter((r): r is EntryRow => r !== null);
        if (rows.length) {
          const { error } = await supabaseAdmin
            .from("entries")
            .upsert(rows, { onConflict: "vendor_id,external_id", ignoreDuplicates: true });
          if (error) throw error;
        }
        console.log(`  ✓ ${vendor.name} (${feed.kind}): ${rows.length} items`);
      } catch (e: any) {
        console.log(`  ✗ ${vendor.name} (${feed.kind}): ${String(e.message).slice(0, 80)}`);
      }
    }
  }

  console.log("\n── Rating with Gemini (max 15) ──");
  const { data: unrated } = await supabaseAdmin
    .from("entries")
    .select("id, title, body, vendors(name)")
    .is("severity", null)
    .limit(50);

  for (const entry of unrated ?? []) {
    const vendorName = (entry as any).vendors?.name ?? "Unknown";
    try {
      const r = await rateEntry({ vendor: vendorName, title: entry.title, body: (entry as any).body });
      await supabaseAdmin.from("entries").update({ severity: r.severity, why: r.why }).eq("id", entry.id);
      console.log(`  ${dot(r.severity)} ${vendorName}: ${String(entry.title).slice(0, 60)}`);
    } catch (e: any) {
      console.log(`  ! rate failed: ${String(e.message).slice(0, 120)}`);
    }
  }

  // Mirror the real digest query: only red/yellow/green are shown to users.
  const { data: rated } = await supabaseAdmin
    .from("entries")
    .select("severity, why, title, vendors(name)")
    .in("severity", ["red", "yellow", "green"])
    .order("published_at", { ascending: false })
    .limit(30);

  const { count: skipped } = await supabaseAdmin
    .from("entries")
    .select("id", { count: "exact", head: true })
    .eq("severity", "skip");

  console.log(`\n── Digest-visible entries (${rated?.length ?? 0} shown · ${skipped ?? 0} dropped as skip) ──`);
  for (const e of rated ?? []) {
    console.log(`  ${dot((e as any).severity)} [${(e as any).vendors?.name}] ${String(e.title).slice(0, 65)}`);
    console.log(`      ↳ ${(e as any).why}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
