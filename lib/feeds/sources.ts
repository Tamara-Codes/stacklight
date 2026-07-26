// The vendor registry. Adding a new tool to monitor = adding an entry here,
// not writing new code. We pull from official changelog/RSS/status feeds —
// NOT by scraping HTML, which is brittle and breaks every time a site redesigns.
//
// Feed-choice rules (learned the hard way — see git/history of this file):
//   - PREFER a changelog/release-notes feed: it carries the features,
//     deprecations, and breaking changes the digest is actually about.
//   - status feeds (Atlassian Statuspage `/history.atom|.rss`) are the reliable
//     backbone: incidents, scheduled maintenance, and breaking-change notices.
//     They're also what powers the "instant red alert" path.
//   - Only use a GitHub `releases.atom` where the LIBRARY IS THE PRODUCT
//     (Next.js, React, Bun…). An SDK repo's releases tell you the SDK bumped a
//     version — NOT that a model was deprecated or pricing changed. That's why
//     Anthropic/OpenAI/Supabase use their STATUS feeds, not their SDK repos.
//
// Every URL below was verified against the live parser. When adding a vendor,
// test the feed the same way before committing it — vendors move these.
//
// Vendors with `feeds: []` are UI-only for now: they show up as selectable
// bubbles (ingest upserts the vendor row) but nothing is polled or rated until
// a verified feed is added.

export type FeedKind = "rss" | "status" | "releases";

export interface FeedSource {
  kind: FeedKind;
  url: string;
}

export interface VendorDef {
  slug: string;
  name: string;
  homepage: string;
  feeds: FeedSource[];
}

// Every vendor we've ever verified a feed for. Definitions live here permanently
// so a re-verified feed URL is never lost — what ships is VENDORS (below), which
// is this list minus PARKED_SLUGS. To re-enable a vendor, delete its slug there.
const ALL_VENDORS: VendorDef[] = [
  // ===== AI / LLM =====
  {
    slug: "anthropic",
    name: "Anthropic",
    homepage: "https://www.anthropic.com",
    feeds: [{ kind: "status", url: "https://status.anthropic.com/history.atom" }],
  },
  {
    slug: "openai",
    name: "OpenAI",
    homepage: "https://openai.com",
    feeds: [
      { kind: "status", url: "https://status.openai.com/history.atom" },
      // News feed carries model/product announcements; the rater's "skip"
      // rule filters out the pure-marketing posts.
      { kind: "rss", url: "https://openai.com/news/rss.xml" },
    ],
  },
  {
    slug: "google-cloud",
    name: "Google Cloud (Gemini / Vertex)",
    homepage: "https://cloud.google.com",
    feeds: [
      { kind: "status", url: "https://status.cloud.google.com/en/feed.atom" },
      { kind: "rss", url: "https://cloud.google.com/feeds/vertex-ai-release-notes.xml" },
    ],
  },
  {
    slug: "perplexity",
    name: "Perplexity",
    homepage: "https://www.perplexity.ai",
    feeds: [{ kind: "status", url: "https://status.perplexity.com/history.atom" }],
  },
  {
    slug: "groq",
    name: "Groq",
    homepage: "https://groq.com",
    feeds: [{ kind: "status", url: "https://groqstatus.com/history.atom" }],
  },
  {
    slug: "xai",
    name: "xAI",
    homepage: "https://x.ai",
    // status.x.ai sits behind Cloudflare bot-blocking (403 even with a browser
    // UA) — a feed here would fail in production too. Firecrawl candidate.
    feeds: [],
  },
  {
    slug: "openrouter",
    name: "OpenRouter",
    homepage: "https://openrouter.ai",
    // No feed on status.openrouter.ai or openrouter.ai/changelog. Firecrawl candidate.
    feeds: [],
  },

  // ===== AI agent tooling =====
  {
    slug: "langchain",
    name: "LangChain",
    homepage: "https://www.langchain.com",
    // Monorepo releases cover all langchain-* packages.
    feeds: [{ kind: "releases", url: "https://github.com/langchain-ai/langchain/releases.atom" }],
  },
  {
    slug: "langgraph",
    name: "LangGraph",
    homepage: "https://www.langchain.com/langgraph",
    feeds: [{ kind: "releases", url: "https://github.com/langchain-ai/langgraph/releases.atom" }],
  },
  {
    slug: "langsmith",
    name: "LangSmith",
    homepage: "https://smith.langchain.com",
    feeds: [{ kind: "status", url: "https://status.smith.langchain.com/history.atom" }],
  },
  {
    slug: "composio",
    name: "Composio",
    homepage: "https://composio.dev",
    feeds: [{ kind: "status", url: "https://status.composio.dev/history.atom" }],
  },
  {
    slug: "e2b",
    name: "E2B",
    homepage: "https://e2b.dev",
    feeds: [{ kind: "status", url: "https://status.e2b.dev/history.atom" }],
  },
  {
    slug: "browseruse",
    name: "Browser Use",
    homepage: "https://browser-use.com",
    feeds: [{ kind: "releases", url: "https://github.com/browser-use/browser-use/releases.atom" }],
  },
  {
    slug: "firecrawl",
    name: "Firecrawl",
    homepage: "https://www.firecrawl.dev",
    feeds: [
      { kind: "status", url: "https://status.firecrawl.dev/feed.rss" },
      { kind: "releases", url: "https://github.com/firecrawl/firecrawl/releases.atom" },
    ],
  },
  {
    slug: "exa",
    name: "Exa",
    homepage: "https://exa.ai",
    // status.exa.ai exposes no feed. Firecrawl candidate.
    feeds: [],
  },
  {
    slug: "linkup",
    name: "Linkup",
    homepage: "https://www.linkup.so",
    // No status page or changelog feed found. Firecrawl candidate.
    feeds: [],
  },
  {
    slug: "apify",
    name: "Apify",
    homepage: "https://apify.com",
    feeds: [{ kind: "status", url: "https://status.apify.com/history.atom" }],
  },

  // ===== Voice / meetings =====
  {
    slug: "elevenlabs",
    name: "ElevenLabs",
    homepage: "https://elevenlabs.io",
    feeds: [{ kind: "status", url: "https://status.elevenlabs.io/history.atom" }],
  },
  {
    slug: "recallai",
    name: "Recall.ai",
    homepage: "https://www.recall.ai",
    // No public status/changelog feed found. Firecrawl candidate.
    feeds: [],
  },
  {
    slug: "deepgram",
    name: "Deepgram",
    homepage: "https://deepgram.com",
    feeds: [{ kind: "status", url: "https://status.deepgram.com/history.atom" }],
  },

  // ===== Hosting / Infra =====
  {
    slug: "vercel",
    name: "Vercel",
    homepage: "https://vercel.com",
    feeds: [
      { kind: "rss", url: "https://vercel.com/changelog/rss.xml" },
      { kind: "status", url: "https://www.vercel-status.com/history.atom" },
    ],
  },
  {
    slug: "netlify",
    name: "Netlify",
    homepage: "https://www.netlify.com",
    feeds: [{ kind: "status", url: "https://www.netlifystatus.com/history.atom" }],
  },
  {
    slug: "cloudflare",
    name: "Cloudflare",
    homepage: "https://www.cloudflare.com",
    feeds: [
      { kind: "rss", url: "https://developers.cloudflare.com/changelog/rss.xml" },
      { kind: "status", url: "https://www.cloudflarestatus.com/history.atom" },
    ],
  },
  {
    slug: "render",
    name: "Render",
    homepage: "https://render.com",
    feeds: [{ kind: "status", url: "https://status.render.com/history.atom" }],
  },
  {
    slug: "flyio",
    name: "Fly.io",
    homepage: "https://fly.io",
    feeds: [{ kind: "status", url: "https://status.flyio.net/history.atom" }],
  },
  {
    slug: "aws",
    name: "AWS",
    homepage: "https://aws.amazon.com",
    // Per-service feeds instead of all.rss: the firehose carried every service
    // in every region, drowning users in irrelevant regional blips. These are
    // empty except during an active incident in that service/region — quiet by
    // design. Extend the list as users ask for more services.
    feeds: [
      { kind: "status", url: "https://status.aws.amazon.com/rss/bedrock-us-east-1.rss" },
      { kind: "status", url: "https://status.aws.amazon.com/rss/ec2-us-east-1.rss" },
      { kind: "status", url: "https://status.aws.amazon.com/rss/s3-us-east-1.rss" },
      { kind: "status", url: "https://status.aws.amazon.com/rss/lambda-us-east-1.rss" },
      { kind: "status", url: "https://status.aws.amazon.com/rss/ses-us-east-1.rss" },
      { kind: "status", url: "https://status.aws.amazon.com/rss/rds-us-east-1.rss" },
      { kind: "status", url: "https://status.aws.amazon.com/rss/ec2-eu-west-1.rss" },
    ],
  },
  {
    slug: "github",
    name: "GitHub",
    homepage: "https://github.com",
    feeds: [
      { kind: "rss", url: "https://github.blog/changelog/feed/" },
      { kind: "status", url: "https://www.githubstatus.com/history.atom" },
    ],
  },
  {
    slug: "inngest",
    name: "Inngest",
    homepage: "https://www.inngest.com",
    feeds: [{ kind: "status", url: "https://status.inngest.com/history.atom" }],
  },

  // ===== Database / Backend =====
  {
    slug: "supabase",
    name: "Supabase",
    homepage: "https://supabase.com",
    feeds: [{ kind: "status", url: "https://status.supabase.com/history.atom" }],
  },
  {
    slug: "planetscale",
    name: "PlanetScale",
    homepage: "https://planetscale.com",
    feeds: [{ kind: "status", url: "https://www.planetscalestatus.com/history.atom" }],
  },
  {
    slug: "mongodb",
    name: "MongoDB Atlas",
    homepage: "https://www.mongodb.com",
    feeds: [{ kind: "status", url: "https://status.mongodb.com/history.atom" }],
  },
  {
    slug: "upstash",
    name: "Upstash",
    homepage: "https://upstash.com",
    feeds: [{ kind: "status", url: "https://status.upstash.com/history.atom" }],
  },
  {
    slug: "postgresql",
    name: "PostgreSQL",
    homepage: "https://www.postgresql.org",
    feeds: [{ kind: "releases", url: "https://www.postgresql.org/versions.rss" }],
  },
  {
    slug: "redis",
    name: "Redis",
    homepage: "https://redis.io",
    feeds: [{ kind: "releases", url: "https://github.com/redis/redis/releases.atom" }],
  },
  {
    slug: "chromadb",
    name: "ChromaDB",
    homepage: "https://www.trychroma.com",
    feeds: [{ kind: "releases", url: "https://github.com/chroma-core/chroma/releases.atom" }],
  },

  // ===== Auth =====
  {
    slug: "clerk",
    name: "Clerk",
    homepage: "https://clerk.com",
    feeds: [{ kind: "status", url: "https://status.clerk.com/history.atom" }],
  },
  {
    slug: "workos",
    name: "WorkOS",
    homepage: "https://workos.com",
    feeds: [{ kind: "status", url: "https://status.workos.com/history.atom" }],
  },
  {
    slug: "auth0",
    name: "Auth0",
    homepage: "https://auth0.com",
    // status.auth0.com is a custom Next.js SPA (status-page-v2) — no RSS/atom and
    // its backend 400/404s on every feed/JSON endpoint. Firecrawl candidate.
    feeds: [],
  },

  // ===== Payments =====
  {
    slug: "stripe",
    name: "Stripe",
    homepage: "https://stripe.com",
    feeds: [{ kind: "status", url: "https://www.stripestatus.com/history.rss" }],
  },

  // ===== Email / Comms =====
  {
    slug: "resend",
    name: "Resend",
    homepage: "https://resend.com",
    feeds: [
      { kind: "status", url: "https://resend-status.com/history.atom" },
      { kind: "rss", url: "https://resend.com/changelog/rss.xml" },
    ],
  },
  {
    slug: "twilio",
    name: "Twilio",
    homepage: "https://www.twilio.com",
    feeds: [{ kind: "status", url: "https://status.twilio.com/history.rss" }],
  },
  {
    slug: "sendgrid",
    name: "SendGrid",
    homepage: "https://sendgrid.com",
    feeds: [{ kind: "status", url: "https://status.sendgrid.com/history.atom" }],
  },
  {
    slug: "brevo",
    name: "Brevo",
    homepage: "https://www.brevo.com",
    feeds: [{ kind: "status", url: "https://status.brevo.com/history.atom" }],
  },

  // ===== Monitoring / Observability =====
  {
    slug: "sentry",
    name: "Sentry",
    homepage: "https://sentry.io",
    feeds: [
      { kind: "status", url: "https://status.sentry.io/history.atom" },
      { kind: "rss", url: "https://sentry.io/changelog/feed.xml" },
    ],
  },
  {
    slug: "datadog",
    name: "Datadog",
    homepage: "https://www.datadoghq.com",
    feeds: [{ kind: "status", url: "https://status.datadoghq.com/history.atom" }],
  },
  {
    slug: "posthog",
    name: "PostHog",
    homepage: "https://posthog.com",
    // status.posthog.com renders client-side only (no feed); posthog.com/rss.xml
    // is the engineering blog, not a changelog. Firecrawl candidate.
    feeds: [],
  },
  {
    slug: "svix",
    name: "Svix",
    homepage: "https://www.svix.com",
    feeds: [{ kind: "status", url: "https://status.svix.com/history.atom" }],
  },

  // ===== Frameworks / runtimes / libraries (the library IS the product) =====
  {
    slug: "nextjs",
    name: "Next.js",
    homepage: "https://nextjs.org",
    feeds: [{ kind: "releases", url: "https://github.com/vercel/next.js/releases.atom" }],
  },
  {
    slug: "react",
    name: "React",
    homepage: "https://react.dev",
    feeds: [{ kind: "releases", url: "https://github.com/facebook/react/releases.atom" }],
  },
  {
    slug: "nodejs",
    name: "Node.js",
    homepage: "https://nodejs.org",
    feeds: [{ kind: "releases", url: "https://nodejs.org/en/feed/releases.xml" }],
  },
  {
    slug: "deno",
    name: "Deno",
    homepage: "https://deno.com",
    feeds: [{ kind: "releases", url: "https://github.com/denoland/deno/releases.atom" }],
  },
  {
    slug: "bun",
    name: "Bun",
    homepage: "https://bun.sh",
    feeds: [{ kind: "releases", url: "https://github.com/oven-sh/bun/releases.atom" }],
  },
  {
    slug: "prisma",
    name: "Prisma",
    homepage: "https://www.prisma.io",
    feeds: [{ kind: "releases", url: "https://github.com/prisma/prisma/releases.atom" }],
  },
  {
    slug: "tailwindcss",
    name: "Tailwind CSS",
    homepage: "https://tailwindcss.com",
    feeds: [{ kind: "releases", url: "https://github.com/tailwindlabs/tailwindcss/releases.atom" }],
  },
  {
    slug: "fastapi",
    name: "FastAPI",
    homepage: "https://fastapi.tiangolo.com",
    feeds: [{ kind: "releases", url: "https://github.com/fastapi/fastapi/releases.atom" }],
  },
  {
    slug: "pydantic",
    name: "Pydantic",
    homepage: "https://pydantic.dev",
    feeds: [{ kind: "releases", url: "https://github.com/pydantic/pydantic/releases.atom" }],
  },
  {
    slug: "spring-boot",
    name: "Spring Boot",
    homepage: "https://spring.io/projects/spring-boot",
    feeds: [{ kind: "releases", url: "https://github.com/spring-projects/spring-boot/releases.atom" }],
  },
  {
    slug: "java",
    name: "Java",
    homepage: "https://www.java.com",
    // openjdk/jdk releases.atom is per-build early-access tags (jdk-28+5, …) —
    // constant version-bump noise, not GA/security news. No clean official feed
    // found; Temurin's repo has no releases. Firecrawl candidate.
    feeds: [],
  },
];

// Parked for v1 (2026-07-26). Deliberately NOT deleted: every feed URL above was
// verified against the live parser, and re-researching them later is the expensive
// part. Scope is a product decision — a focused picker tells us what people
// actually want, and a smaller registry means fewer Gemini calls and less to
// maintain while we validate. Re-enable by removing a slug from this set (and
// flipping vendors.active in the DB — see db/schema.sql).
//
// Three reasons a vendor is here:
//   1. NO FEED — can never produce an update, so offering it in the picker is a
//      lie. Revisit once Firecrawl lands: xai, openrouter, exa, linkup, recallai,
//      auth0, posthog, java.
//   2. OUT OF SCOPE for v1's audience (AI-app builders on a modern JS/Python stack).
//   3. VERSION-BUMP NOISE — release feeds whose entries are almost always
//      "x.y.z released" rather than anything a developer must react to.
const PARKED_SLUGS = new Set<string>([
  // 1. no feed
  "xai", "openrouter", "exa", "linkup", "recallai", "auth0", "posthog", "java",
  // 2. out of scope for v1
  "langchain", "langsmith", "e2b", "browseruse", "deepgram", "flyio",
  "planetscale", "mongodb", "upstash", "twilio", "sendgrid", "brevo",
  "datadog", "svix", "sentry",
  // 3. version-bump noise
  "deno", "bun", "prisma", "spring-boot",
]);

// What actually ships: polled by the ingest jobs, and the set the picker offers.
export const VENDORS: VendorDef[] = ALL_VENDORS.filter((v) => !PARKED_SLUGS.has(v.slug));

// Exported for the migration/back-office path that flips vendors.active — the DB
// keeps rows (and their entries) for parked vendors, it just stops offering them.
export const PARKED_VENDOR_SLUGS: string[] = [...PARKED_SLUGS];
