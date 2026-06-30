// Content pipeline: poll every vendor feed, store new updates (idempotently),
// then rate any unrated ones with Gemini. Runs on a schedule. This is the
// "expensive" work that happens ONCE per update, shared by every user.
import Parser from "rss-parser";
import { inngest } from "@/lib/inngest/client";
import { supabaseAdmin } from "@/lib/db/admin";
import { VENDORS } from "@/lib/feeds/sources";
import { toEntryRow, type EntryRow } from "@/lib/feeds/normalize";
import { rateEntry } from "@/lib/ai/severity";

const parser = new Parser();

export const ingestFeeds = inngest.createFunction(
  { id: "ingest-feeds" },
  { cron: "0 6 * * *" }, // 06:00 daily; the red-alert poller will be more frequent
  async ({ step }) => {
    for (const vendor of VENDORS) {
      // Ensure the vendor row exists and grab its id.
      const vendorId = await step.run(`vendor-${vendor.slug}`, async () => {
        const { data } = await supabaseAdmin
          .from("vendors")
          .upsert(
            { slug: vendor.slug, name: vendor.name, homepage: vendor.homepage },
            { onConflict: "slug" }
          )
          .select("id")
          .single();
        return data!.id as number;
      });

      // Pull each feed and upsert entries. The (vendor_id, external_id) unique
      // constraint makes re-polling the same feed a no-op — no duplicates.
      for (const feed of vendor.feeds) {
        await step.run(`fetch-${vendor.slug}-${feed.kind}`, async () => {
          const parsed = await parser.parseURL(feed.url);
          const rows = parsed.items
            .map((item) => toEntryRow(vendorId, item))
            .filter((r): r is EntryRow => r !== null);
          if (rows.length) {
            await supabaseAdmin
              .from("entries")
              .upsert(rows, { onConflict: "vendor_id,external_id", ignoreDuplicates: true });
          }
        });
      }
    }

    // Rate everything not yet rated. (At real scale this becomes its own
    // fanned-out step; inline is fine while volume is small.)
    await step.run("rate-unrated", async () => {
      const { data: unrated } = await supabaseAdmin
        .from("entries")
        .select("id, title, body, vendors(name)")
        .is("severity", null)
        .limit(100);

      for (const entry of unrated ?? []) {
        const vendorName = (entry as any).vendors?.name ?? "Unknown";
        const rating = await rateEntry({ vendor: vendorName, title: entry.title, body: entry.body });
        await supabaseAdmin
          .from("entries")
          .update({ severity: rating.severity, why: rating.why })
          .eq("id", entry.id);
      }
    });
  }
);
