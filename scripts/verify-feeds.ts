// Verify candidate feed URLs against the live parser before adding them to
// lib/feeds/sources.ts (the rule at the top of that file).
//
//   npx tsx scripts/verify-feeds.ts <url> [<url> ...]
//   npx tsx scripts/verify-feeds.ts --all        # re-check every feed in sources.ts
//
// Prints one line per feed: OK with item count / stable-id / date of the newest
// item, or FAIL with the error. A feed is safe to add when it's OK, has a
// stable id, and dates parse.
import Parser from "rss-parser";
import { VENDORS } from "../lib/feeds/sources";

const parser = new Parser({ timeout: 15000 });

async function check(label: string, url: string) {
  try {
    const feed = await parser.parseURL(url);
    const first = feed.items?.[0];
    const hasId = Boolean(first?.guid ?? first?.link ?? first?.title);
    const date = first?.isoDate ?? "no-date";
    console.log(
      `OK   ${label} items=${feed.items?.length ?? 0} stable-id=${hasId ? "yes" : "NO"} newest=${date.slice(0, 10)} "${(first?.title ?? "").slice(0, 60)}"`
    );
  } catch (e: any) {
    console.log(`FAIL ${label} ${String(e?.message ?? e).slice(0, 100)} ${url}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const targets =
    args[0] === "--all"
      ? VENDORS.flatMap((v) => v.feeds.map((f) => ({ label: `${v.slug}/${f.kind}`, url: f.url })))
      : args.map((url) => ({ label: url, url }));
  await Promise.all(targets.map((t) => check(t.label, t.url)));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
