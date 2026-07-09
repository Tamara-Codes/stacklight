// Content pipeline: poll every vendor feed, store new/changed updates, then
// rate any unrated ones with Gemini. Runs on a schedule. This is the
// "expensive" work that happens ONCE per update, shared by every user.
// (The frequent status poller in poll-status.ts covers timely reds; this daily
// run covers everything, including changelog/release feeds.)
import { inngest } from "@/lib/inngest/client";
import { VENDORS } from "@/lib/feeds/sources";
import { upsertVendor, syncVendorFeed, rateUnratedEntries } from "@/lib/feeds/sync";

export const ingestFeeds = inngest.createFunction(
  { id: "ingest-feeds" },
  { cron: "0 6 * * *" }, // 06:00 daily
  async ({ step }) => {
    const failures: string[] = [];

    for (const vendor of VENDORS) {
      // Ensure the vendor row exists and grab its id. Vendors with no feeds
      // yet still get a row (so they're pickable in the UI) and are done here.
      const vendorId = await step.run(`vendor-${vendor.slug}`, () => upsertVendor(vendor));

      // Pull each feed and reconcile entries (insert new, re-open changed —
      // see lib/feeds/sync.ts). A broken feed is recorded and skipped rather
      // than thrown: one vendor moving its feed URL must not burn this run's
      // retries and starve every vendor after it in the loop.
      for (const feed of vendor.feeds) {
        await step.run(`fetch-${vendor.slug}-${feed.kind}`, async () => {
          try {
            return await syncVendorFeed(vendorId, feed);
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            failures.push(`${vendor.slug}/${feed.kind}: ${message.slice(0, 120)}`);
            return { inserted: 0, updated: 0, failed: true };
          }
        });
      }
    }

    // Rate everything not yet rated, draining in batches (a big feed day used
    // to silently backlog behind a 100-entry cap).
    const rating = await step.run("rate-unrated", () => rateUnratedEntries(500));

    // Reds found here too fan out as instant alerts — changelog/release feeds
    // aren't covered by the status poller, and a breaking change is exactly
    // what Pro users pay to hear about fast. The `alert:<entry_id>` dedupe in
    // deliveries makes double-emitting with poll-status harmless.
    if (rating.redIds.length) {
      await step.sendEvent(
        "alert-reds",
        rating.redIds.map((entryId) => ({ name: "alert/entry.red" as const, data: { entryId } }))
      );
    }

    // Surface failures in the run result so they're visible in the Inngest
    // dashboard — a feed that fails every day needs its URL re-verified.
    return { rated: rating.rated, reds: rating.redIds.length, failures };
  }
);
