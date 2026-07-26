// Half-hourly poller for STATUS feeds only. The daily ingest (06:00) covers
// everything including changelogs/releases; this one exists so an outage or
// breaking-change notice surfaces in minutes, not the next morning — reds are
// only worth anything while they're happening.
//
// Cheap by construction: status feeds are small, re-polls are no-ops thanks to
// the diff in syncVendorFeed, and rating still only happens for entries whose
// severity is null (new or changed) — so this adds no per-user or per-poll AI
// cost. This is also where an instant "red alert" send (the Founder feature)
// should hook in later: after rating, fan out an event per fresh red entry.
import { inngest } from "@/lib/inngest/client";
import { supabaseAdmin } from "@/lib/db/admin";
import { VENDORS } from "@/lib/feeds/sources";
import { syncVendorFeed, rateUnratedEntries } from "@/lib/feeds/sync";

export const pollStatusFeeds = inngest.createFunction(
  { id: "poll-status-feeds" },
  // Every 30 min, not 10: the sweep is the biggest fixed cost in Inngest steps
  // (~4.3k/month at */10) and at v1 subscriber counts a red arriving in ≤30 min
  // is still "instant" next to the daily digest. Tighten this as usage justifies.
  { cron: "*/30 * * * *" },
  async ({ step }) => {
    // One step for the whole sweep (unlike the daily ingest's step-per-feed):
    // at this cadence a failed feed just gets retried on the next sweep, so
    // fine-grained retry isolation isn't worth 40+ Inngest steps per run.
    const result = await step.run("sync-status-feeds", async () => {
      const { data: vendorRows } = await supabaseAdmin.from("vendors").select("id, slug");
      const idBySlug = new Map((vendorRows ?? []).map((v) => [v.slug as string, v.id as number]));

      let inserted = 0;
      let updated = 0;
      const failures: string[] = [];

      for (const vendor of VENDORS) {
        const vendorId = idBySlug.get(vendor.slug);
        if (!vendorId) continue; // row appears after the next daily ingest
        for (const feed of vendor.feeds) {
          if (feed.kind !== "status") continue;
          try {
            const r = await syncVendorFeed(vendorId, feed);
            inserted += r.inserted;
            updated += r.updated;
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            failures.push(`${vendor.slug}: ${message.slice(0, 120)}`);
          }
        }
      }
      return { inserted, updated, failures };
    });

    // Only spend a Gemini call when the sweep actually found something.
    let rating = { rated: 0, redIds: [] as number[] };
    if (result.inserted + result.updated > 0) {
      rating = await step.run("rate", () => rateUnratedEntries(100));
    }

    // The instant-alert hook: one event per fresh red. dispatchRedAlert
    // (alerts.ts) fans out from there to the Slack-connected Pro users.
    if (rating.redIds.length) {
      await step.sendEvent(
        "alert-reds",
        rating.redIds.map((entryId) => ({ name: "alert/entry.red" as const, data: { entryId } }))
      );
    }

    return { ...result, rated: rating.rated, reds: rating.redIds.length };
  }
);
