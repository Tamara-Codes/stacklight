// One-off test of the content pipeline: fetch every vendor feed, store new
// entries, then rate the unrated ones with Gemini. Mirrors what the Inngest
// ingest function does, but runnable standalone so we can see it work.
// Run: set -a; . ./.env; set +a; npm run test:ingest
import { VENDORS } from "../lib/feeds/sources";
import { supabaseAdmin } from "../lib/db/admin";
import { upsertVendor, syncVendorFeed } from "../lib/feeds/sync";
import { rateEntry } from "../lib/ai/severity";

const dot = (s: string) =>
  s === "red" ? "🔴" : s === "yellow" ? "🟡" : s === "green" ? "🟢" : "⚫"; // ⚫ = skip (dropped from digest)

async function main() {
  console.log("── Fetching feeds ──");
  for (const vendor of VENDORS) {
    let vendorId: number;
    try {
      vendorId = await upsertVendor(vendor);
    } catch (e: any) {
      console.log(`  ✗ ${vendor.name}: ${String(e.message).slice(0, 80)}`);
      continue;
    }

    for (const feed of vendor.feeds) {
      try {
        const r = await syncVendorFeed(vendorId, feed, { maxItems: 10 });
        console.log(`  ✓ ${vendor.name} (${feed.kind}): +${r.inserted} new, ~${r.updated} updated`);
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
