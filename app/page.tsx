// Landing page — pre-sell asset for the X / LinkedIn launch. PAS-structured
// (Problem, Agitate, Solution). Styling uses the tokens in globals.css — do
// not introduce new colors. The red/yellow/green dots are SEMANTIC (severity), the
// one case where status dots are intentional, not decoration.

// Real brand marks via Simple Icons CDN, served white and dimmed via CSS so they
// read on the dark theme. Brands missing from Simple Icons (OpenAI: CDN 404s) fall
// back to a clean wordmark rather than a broken image. Every brand listed here must
// exist in lib/feeds/sources.ts — don't advertise a vendor we don't monitor.
import Link from "next/link";

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
const CTA_LABEL = "Start free trial";

export default function Home() {
  return (
    <>
      <nav className="site-nav">
        <div className="site-nav-inner">
          <Link className="brand" href="/">
            <span className="brand-mark" aria-hidden>
              <span style={{ background: "var(--red)" }} />
              <span style={{ background: "var(--yellow)" }} />
              <span style={{ background: "var(--green)" }} />
            </span>
            Stacklight
          </Link>
          <div className="site-links">
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="/sign-in">Sign in</a>
          </div>
        </div>
      </nav>

      <main>
        {/* ===== HERO (asymmetric split: copy + the actual digest email) ===== */}
        <section className="container wide hero" style={{ padding: "80px 24px 48px" }}>
          <div className="hero-grid">
            <div>
              <h1 className="display rise">
                Know what changed in your stack before it breaks prod.
              </h1>
              <p className="rise d1" style={{ fontSize: 18, color: "var(--muted)", maxWidth: 440, margin: 0 }}>
                One daily email rating every update in your stack, plus a Slack
                ping the moment something breaks.
              </p>
              <div className="rise d2" style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a className="btn lg" href="/sign-in">{CTA_LABEL}</a>
                <a className="btn lg ghost" href="#how">See how it works</a>
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

        {/* ===== PROBLEM (agitate) — one bad day in an unwatched stack, as a timeline.
             Sits on the plain page background; the Slack band below is the page's ONE
             full-bleed accent moment. ===== */}
        <section>
          <div className="container" style={{ padding: "72px 24px 40px" }}>
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

        {/* ===== SLACK INSTANT ALERTS — full-bleed accent band with semaphore ===== */}
        <section className="bleed slack" style={{ margin: "48px 0" }}>
          <div className="container wide" style={{ padding: "72px 24px" }}>
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
                  update lands on one of your tools, Stacklight pings your Slack,
                  so you&apos;re patching before your users are refreshing. Any
                  channel, or a webhook straight into your own pipeline.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== HOW IT WORKS (borderless numbered steps over soft accent circles) ===== */}
        <section id="how" className="container wide howit" style={{ padding: "64px 32px" }}>
          <span className="ring r1" aria-hidden />
          <span className="ring r2" aria-hidden />
          <h2 style={{ fontSize: 28, marginBottom: 8 }}>How it works</h2>
          <div className="steps" style={{ marginTop: 24 }}>
            <Step n="1" title="Pick your stack" body="Choose from 40+ supported vendors. Takes about a minute." />
            <Step n="2" title="We watch, so you don't" body="Every morning we poll the official sources and rate each new update." />
            <Step n="3" title="Read one email" body="Scan the reds with your coffee. Reds in between ping your Slack instantly." />
          </div>
        </section>

        {/* ===== PRICING ===== */}
        <section id="pricing" className="container wide" style={{ padding: "40px 24px 48px" }}>
          <h2 style={{ fontSize: 28 }}>Simple pricing</h2>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            Everything is free for 14 days — no card, no plan choice. Then pick
            by the size of the stack you built. Cancel anytime.
          </p>
          <div className="plans" style={{ marginTop: 20 }}>
            <Plan
              name="Starter"
              price="€5"
              suffix="/mo"
              cta={CTA_LABEL}
              lines={["Up to 10 tools", "Daily digest, rated red, yellow, green", "Instant Slack alerts on reds"]}
            />
            <Plan
              name="Full Stack"
              price="€10"
              suffix="/mo"
              recommended
              cta={CTA_LABEL}
              lines={["Unlimited tools", "Daily digest, rated red, yellow, green", "Instant Slack alerts on reds, plus webhooks"]}
              note="Stop one 2 a.m. outage and the year pays for itself."
            />
          </div>
        </section>

        {/* ===== FAQ (two-column grid) ===== */}
        <section className="container wide" style={{ padding: "32px 24px" }}>
          <h2 style={{ fontSize: 28, marginBottom: 16 }}>Questions</h2>
          <div className="faq">
            <Faq
              q="Isn’t this just an RSS reader?"
              a="An RSS reader hands you the firehose and makes you judge every item. Stacklight reads it for you and rates each update by how badly it can bite you, so you act on the reds and ignore the rest."
            />
            <Faq
              q="What counts as red?"
              a="Anything that can break running code or cost you money if ignored: breaking API changes, dated deprecations, security advisories, pricing changes. New features are yellow. Cosmetic news is green."
            />
            <Faq
              q="How fast are the Slack alerts?"
              a="As soon as we detect a red-rated update on one of your tools, the ping fires. Minutes, not the next morning. The daily digest still recaps everything, reds first."
            />
            <Faq
              q="Will I get spammed?"
              a="No. At most one email a day for the tools you chose, plus Slack pings reserved strictly for reds. A quiet day means a short digest and silence in Slack."
            />
            <Faq
              q="My tool isn’t listed. Can you add it?"
              a="We pull from official sources: feeds where vendors publish them, their changelogs where they don't. Tell us what you use and it's usually a quick add."
            />
            <Faq
              q="Is there a free plan?"
              a="No free tier, but both plans start with a 14-day free trial and no card is needed to begin. If you don't subscribe when it ends, the emails simply stop."
            />
            <Faq
              q="How do I cancel?"
              a="One click, anytime. No call, no “are you sure” maze."
            />
            <Faq
              q="How accurate are the ratings?"
              a="Ratings come from the official source text, scored for real-world impact. The full item is always one click away if you want to judge for yourself."
            />
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="container" style={{ padding: "48px 24px 88px", textAlign: "center" }}>
          <h2 style={{ fontSize: 30, margin: "0 0 10px", lineHeight: 1.15 }}>
            Your stack ships changes today, whether you&apos;re reading them or not.
          </h2>
          <p style={{ fontSize: 17, color: "var(--muted)", maxWidth: 520, margin: "0 auto 24px" }}>
            The next breaking change is already in someone&apos;s release notes. Catch it
            before it catches you.
          </p>
          <a className="btn lg" href="/sign-in">{CTA_LABEL}</a>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 14 }}>
            14 days free, no card. Cancel anytime.
          </p>
        </section>
      </main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <span>© 2026 Stacklight</span>
          <span style={{ display: "flex", gap: 20 }}>
            <a href="#pricing">Pricing</a>
            <a href="/sign-in">Sign in</a>
          </span>
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

function Plan({
  name, price, suffix, lines, recommended, note, cta,
}: {
  name: string; price: string; suffix?: string; lines: string[];
  recommended?: boolean; note?: string; cta: string;
}) {
  return (
    <div
      className={`card${recommended ? " recommended" : ""}`}
      // Flex column so the CTA bottom-aligns across cards whose line counts differ.
      style={{ border: `1px solid ${recommended ? "var(--accent)" : "var(--line)"}`, padding: 24, display: "flex", flexDirection: "column" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <h3 style={{ margin: 0 }}>{name}</h3>
        {recommended && <span className="badge">Recommended</span>}
      </div>
      <p className="plan-price">
        {price}{suffix && <small>{suffix}</small>}
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, color: "var(--muted)", display: "grid", gap: 6 }}>
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      {note && (
        <p style={{ margin: "14px 0 0", color: "var(--muted)", fontSize: 13.5, fontStyle: "italic" }}>
          {note}
        </p>
      )}
      <div style={{ marginTop: "auto", paddingTop: 18 }}>
        <a className={`btn${recommended ? "" : " ghost"}`} href="/sign-in">{cta}</a>
      </div>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="card">
      <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>{q}</h3>
      <p style={{ margin: 0, color: "var(--muted)", fontSize: 15 }}>{a}</p>
    </div>
  );
}
