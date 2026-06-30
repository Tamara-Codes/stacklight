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

export const VENDORS: VendorDef[] = [
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
    feeds: [{ kind: "status", url: "https://status.openai.com/history.atom" }],
  },
  {
    slug: "google-cloud",
    name: "Google Cloud (Gemini / Vertex)",
    homepage: "https://cloud.google.com",
    feeds: [{ kind: "status", url: "https://status.cloud.google.com/en/feed.atom" }],
  },
  {
    slug: "perplexity",
    name: "Perplexity",
    homepage: "https://www.perplexity.ai",
    feeds: [{ kind: "status", url: "https://status.perplexity.com/history.atom" }],
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
    feeds: [{ kind: "status", url: "https://status.aws.amazon.com/rss/all.rss" }],
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
    feeds: [{ kind: "status", url: "https://resend-status.com/history.atom" }],
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

  // ===== Monitoring / Observability =====
  {
    slug: "sentry",
    name: "Sentry",
    homepage: "https://sentry.io",
    feeds: [{ kind: "status", url: "https://status.sentry.io/history.atom" }],
  },
  {
    slug: "datadog",
    name: "Datadog",
    homepage: "https://www.datadoghq.com",
    feeds: [{ kind: "status", url: "https://status.datadoghq.com/history.atom" }],
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
];
