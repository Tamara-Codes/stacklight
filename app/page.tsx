// Landing page — pre-sell asset for the X / LinkedIn launch. PAS-structured
// (Problem, Agitate, Solution). Styling uses the tokens in globals.css — do
// not introduce new colors. The red/yellow/green dots are SEMANTIC (severity), the
// one case where status dots are intentional, not decoration.
import Link from "next/link";

// Real brand marks via Simple Icons CDN, served white and dimmed via CSS so they
// read on the dark theme. Brands missing from Simple Icons (OpenAI: CDN 404s) fall
// back to a clean wordmark rather than a broken image. Every brand listed here must
// exist in lib/feeds/sources.ts — don't advertise a vendor we don't monitor.
const VENDORS = [
  { name: "Anthropic", slug: "anthropic" },
  { name: "OpenAI", slug: null },
  { name: "Vercel", slug: "vercel" },
  { name: "Supabase", slug: "supabase" },
  { name: "Clerk", slug: "clerk" },
  { name: "Cloudflare", slug: "cloudflare" },
  { name: "GitHub", slug: "github" },
  { name: "Stripe", slug: "stripe" },
  { name: "Sentry", slug: "sentry" },
  { name: "Datadog", slug: "datadog" },
  { name: "Resend", slug: "resend" },
  { name: "PostHog", slug: "posthog" },
];

// One label per intent, sitewide: every signup CTA says exactly this.
const CTA_LABEL = "Get started";

export default function Home() {
  return (
    <>
      <main>
        {/* ===== HERO (asymmetric split: copy + the actual digest email) ===== */}
        <section className="container wide hero" style={{ padding: "80px 24px 48px" }}>
          <div className="landing-brand-row">
            <Link href="/" className="landing-brand" aria-label="StackLight home">
              <span className="landing-brand-mark" aria-hidden><span /><span /><span /></span>
              StackLight
            </Link>
          </div>
          <div className="hero-grid">
            <div>
              <h1 className="display rise">
                Know what changed in your stack before it breaks prod.
              </h1>
              <p className="rise d1" style={{ fontSize: 18, color: "var(--muted)", maxWidth: 440, margin: 0 }}>
                One daily email rating every update in your stack, plus an
                instant Slack or Discord ping the moment something breaks.
              </p>
              <div className="rise d2" style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a className="btn lg" href="/subscribe">{CTA_LABEL}</a>
              </div>
            </div>
            <div className="rise d3">
              <SampleDigest />
            </div>
          </div>
        </section>

        {/* ===== VENDOR LOGO STRIP (under the hero, logos only) ===== */}
        <section className="container wide" style={{ padding: "16px 24px 56px" }}>
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 18 }}>
            Monitoring 40+ vendors, including
          </p>
          <div className="logos">
            {VENDORS.map((v) =>
              v.slug ? (
                <img
                  key={v.name}
                  src={`https://cdn.simpleicons.org/${v.slug}/ffffff`}
                  alt={v.name}
                  height={22}
                />
              ) : (
                <span key={v.name} className="wordmark">{v.name}</span>
              )
            )}
          </div>
        </section>

        {/* ===== SEVERITY LEGEND (compact strip) ===== */}
        <section className="container wide" style={{ paddingBottom: 24 }}>
          <div className="legend">
            <LegendItem color="red" head="Read it now" body="Breaking change, security, or pricing." />
            <LegendItem color="yellow" head="Worth knowing" body="New feature or an upcoming deprecation." />
            <LegendItem color="green" head="Skip unless curious" body="Minor or cosmetic, no action needed." />
          </div>
        </section>

        {/* ===== PROBLEM (agitate) — one bad day in an unwatched stack, as a timeline ===== */}
        <section>
          <div className="container" style={{ padding: "96px 24px 72px" }}>
            <h2 style={{ fontSize: "clamp(30px, 3.4vw, 38px)", lineHeight: 1.1, margin: 0, maxWidth: "22ch" }}>
              The changelog didn&apos;t warn you. The 500 error did.
            </h2>
            <p style={{ fontSize: 17, color: "var(--muted)", margin: "14px 0 0", maxWidth: 560 }}>
              Every tool ships on its own schedule, and the updates that matter
              are buried in changelogs you stopped reading months ago.
            </p>
            <div className="timeline">
              <TimelineItem
                time="02:14"
                text="A model you call in production was deprecated overnight. Your app is throwing 500s while you sleep."
              />
              <TimelineItem
                time="09:40"
                text="A dependency shipped a breaking change, and a deploy that changed nothing won't build."
              />
              <TimelineItem
                time="11:02"
                text="The invoice lands. A vendor doubled its pricing three months ago, and nobody said a word."
              />
            </div>
          </div>
        </section>

        {/* ===== HOW IT WORKS (borderless numbered steps over soft accent circles) ===== */}
        <section id="how" className="container wide howit" style={{ padding: "96px 32px" }}>
          <span className="ring r1" aria-hidden />
          <span className="ring r2" aria-hidden />
          <h2 style={{ fontSize: 28, marginBottom: 8 }}>How it works</h2>
          <div className="steps" style={{ marginTop: 24 }}>
            <Step n="1" title="Pick your stack" body="Choose from 40+ supported vendors." />
            <Step n="2" title="We watch, so you don't" body="Every morning we read each vendor's status page, changelog, and GitHub releases — official feeds only, never scraped — and rate what's new." />
            <Step n="3" title="Read one email" body="Scan the reds with your coffee. Reds in between ping your Slack or Discord instantly." />
          </div>
        </section>

        {/* ===== INSTANT ALERTS — semaphore + copy on the plain page background ===== */}
        <section className="container wide" style={{ padding: "160px 24px 96px" }}>
          <div className="slack-grid">
            <div className="semaphore" aria-hidden>
              <span className="light red" />
              <span className="light yellow" />
              <span className="light green" />
            </div>
            <div>
              <h2 style={{ fontSize: 32, margin: "0 0 12px", lineHeight: 1.12 }}>
                Breaking changes can&apos;t wait for tomorrow&apos;s email.
              </h2>
              <p style={{ fontSize: 18, color: "var(--muted)", maxWidth: 680, margin: 0 }}>
                The daily digest catches everything. But the moment a{" "}
                <strong style={{ color: "var(--text)", fontWeight: 600 }}>red-rated</strong>{" "}
                update lands on one of your tools, StackLight pings you
                instantly — in Slack, Discord, or your inbox — so you&apos;re
                patching before your users are refreshing.
              </p>
            </div>
          </div>
        </section>

      </main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <span>© 2026 Nos Astra. All rights reserved.</span>
          <a href="mailto:stacklight@nosastra.co">stacklight@nosastra.co</a>
        </div>
      </footer>
    </>
  );
}

// Mirrors the actual digest email the product sends — a real preview of the
// deliverable, not a fake app screenshot.
function SampleDigest() {
  return (
    <div className="email-card">
      <div className="email-head">
        <span className="email-subject">Today in your stack</span>
        <span className="email-meta">2 red, 1 yellow, 1 green</span>
      </div>
      <div className="email-body">
        <DigestItem color="red" vendor="Anthropic" text="A model you use is scheduled for deprecation." />
        <DigestItem color="red" vendor="Stripe" text="Breaking change to the Checkout API next version." />
        <DigestItem color="yellow" vendor="Supabase" text="New connection pooler defaults rolling out." />
        <DigestItem color="green" vendor="Vercel" text="Dashboard UI refresh, no action needed." />
      </div>
    </div>
  );
}

function LegendItem({ color, head, body }: { color: string; head: string; body: string }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span className={`dot ${color}`} />
        <strong style={{ fontSize: 14, fontWeight: 600 }}>{head}</strong>
      </div>
      <span style={{ color: "var(--muted)", fontSize: 14 }}>{body}</span>
    </div>
  );
}

function TimelineItem({ time, text }: { time: string; text: string }) {
  return (
    <div className="tl-item">
      <span className="tl-time">{time}</span>
      <span className="tl-node" aria-hidden>
        <span className="dot red" />
      </span>
      <p className="tl-text">{text}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <div className="step-n">{n}</div>
      <h3 style={{ margin: "0 0 6px", fontSize: 17 }}>{title}</h3>
      <p style={{ margin: 0, color: "var(--muted)", fontSize: 15 }}>{body}</p>
    </div>
  );
}

function DigestItem({ color, vendor, text }: { color: string; vendor: string; text: string }) {
  return (
    <div className="digest-row">
      <span className={`dot ${color}`} />
      <span style={{ fontSize: 14 }}>
        <strong style={{ fontWeight: 600 }}>{vendor}</strong>{" "}
        <span style={{ color: "var(--muted)" }}>{text}</span>
      </span>
    </div>
  );
}
