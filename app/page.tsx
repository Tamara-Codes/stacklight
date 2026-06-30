// Landing page — pre-sell asset for the X / LinkedIn launch. PAS-structured
// (Problem, Agitate, Solution). Auth + checkout get wired in later; CTAs point at
// the (not-yet-built) sign-in route. Styling uses the tokens in globals.css — do
// not introduce new colors. The red/yellow/green dots are SEMANTIC (severity), the
// one case where status dots are intentional, not decoration.

// Real brand marks via Simple Icons CDN, served white and dimmed via CSS so they
// read on the dark theme. A few brands (OpenAI, Twilio) aren't on Simple Icons, so
// they fall back to a clean wordmark rather than a broken image.
const VENDORS = [
  { name: "Anthropic", slug: "anthropic" },
  { name: "OpenAI", slug: null },
  { name: "Vercel", slug: "vercel" },
  { name: "Supabase", slug: "supabase" },
  { name: "Clerk", slug: "clerk" },
  { name: "Twilio", slug: null },
  { name: "Stripe", slug: "stripe" },
];

export default function Home() {
  return (
    <main>
      {/* ===== HERO (asymmetric split: copy + live sample digest) ===== */}
      <section className="container wide" style={{ padding: "88px 24px 40px" }}>
        <div className="hero-grid">
          <div>
            <p className="eyebrow">Stacklight</p>
            <h1 style={{ fontSize: 44, lineHeight: 1.1, margin: "12px 0 16px" }}>
              Know what changed in your stack before it breaks prod.
            </h1>
            <p style={{ fontSize: 18, color: "var(--muted)", maxWidth: 440 }}>
              A daily email rating every update across your dev stack, plus an
              instant Slack ping the moment something breaks.
            </p>
            <div style={{ marginTop: 26, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a className="btn lg" href="/sign-in">Get early access</a>
              <a className="btn lg ghost" href="#how">See how it works</a>
            </div>
          </div>
          <SampleDigest />
        </div>
      </section>

      {/* ===== VENDOR LOGO STRIP (under the hero, logos only) ===== */}
      <section className="container wide" style={{ padding: "8px 24px 48px" }}>
        <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 18 }}>
          Monitoring 40+ tools, including
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
      <section className="container wide" style={{ paddingBottom: 8 }}>
        <div className="legend">
          <LegendItem color="red" head="Read it now" body="Breaking change, security, or pricing." />
          <LegendItem color="yellow" head="Worth knowing" body="New feature or an upcoming deprecation." />
          <LegendItem color="green" head="Skip unless curious" body="Minor or cosmetic, no action needed." />
        </div>
      </section>

      {/* ===== PROBLEM (agitate) — full-bleed editorial band ===== */}
      <section className="bleed problem" style={{ margin: "32px 0" }}>
        <div className="container wide" style={{ padding: "72px 24px" }}>
          <div className="problem-grid">
            <h2 style={{ fontSize: 36, lineHeight: 1.1, margin: 0 }}>
              You didn&apos;t find out from the changelog. You found out from the 500 error.
            </h2>
            <div>
              <p style={{ fontSize: 17, color: "var(--muted)", margin: "0 0 8px", maxWidth: 620 }}>
                Every tool ships on its own schedule: a deprecated API here, a breaking
                SDK bump there, a pricing change you only spot on the invoice. Nobody
                sends a heads-up, and the updates that matter are buried in a dozen
                changelogs you stopped reading months ago.
              </p>
              <div className="incident">
                <span className="dot red" />
                <span>A model you call in production gets deprecated, and your app starts erroring at 2 a.m.</span>
              </div>
              <div className="incident">
                <span className="dot red" />
                <span>A dependency ships a breaking change, and a deploy that changed nothing won&apos;t build.</span>
              </div>
              <div className="incident">
                <span className="dot red" />
                <span>A vendor quietly doubles its pricing, and you catch it three invoices later.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SLACK INSTANT ALERTS — full-bleed accent band with semaphore ===== */}
      <section className="bleed slack" style={{ margin: "32px 0" }}>
        <div className="container wide" style={{ padding: "64px 24px" }}>
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
                The daily digest catches everything. But the second a{" "}
                <strong style={{ color: "var(--text)", fontWeight: 600 }}>red-rated</strong>{" "}
                update lands on one of your tools, Stacklight pings your Slack so you
                can act before it reaches production. Point it at any channel, or fire a
                webhook into your own pipeline.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS (borderless numbered steps over soft accent circles) ===== */}
      <section id="how" className="container wide howit" style={{ padding: "56px 32px" }}>
        <span className="ring r1" aria-hidden />
        <span className="ring r2" aria-hidden />
        <h2 style={{ fontSize: 28, marginBottom: 8 }}>How it works</h2>
        <div className="steps" style={{ marginTop: 20 }}>
          <Step n="1" title="Pick your stack" body="Choose from 40+ supported vendors. About a minute." />
          <Step n="2" title="We watch them daily" body="Each morning we poll the official feeds and rate every new update." />
          <Step n="3" title="Read one email" body="Scan the reds with your coffee. Get a Slack ping the instant anything breaks in between." />
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section className="container wide" style={{ padding: "24px 24px 32px" }}>
        <h2 style={{ fontSize: 28 }}>Simple pricing</h2>
        <p style={{ color: "var(--muted)", marginTop: 4 }}>
          Stop one 2 a.m. outage and the year pays for itself. Cancel anytime.
        </p>
        <div className="plans" style={{ marginTop: 16 }}>
          <Plan
            name="Hobby"
            price="€7/mo"
            lines={["Up to 5 tools", "Daily red, yellow, green digest", "For side projects and solo builders"]}
          />
          <Plan
            name="Founder"
            price="€19/mo"
            recommended
            lines={["Unlimited tools", "Daily digest plus instant Slack alerts on reds", "Slack and webhook integrations"]}
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
            q="How fast are the Slack alerts?"
            a="As soon as we detect a red-rated update on one of your tools, the ping fires. Minutes, not the next morning. The daily digest still recaps everything, reds first."
          />
          <Faq
            q="Will I get spammed?"
            a="No. One email a day for the tools you chose, plus Slack pings reserved strictly for reds. A quiet day means a short digest and silence in Slack."
          />
          <Faq
            q="My tool isn’t listed. Can you add it?"
            a="We’re adding vendors constantly and pull only official RSS, release, and status feeds. Tell us what you use and it’s usually a quick add."
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
      <section className="container" style={{ padding: "32px 24px 96px", textAlign: "center" }}>
        <h2 style={{ fontSize: 30, margin: "0 0 10px", lineHeight: 1.15 }}>
          Your stack ships changes today, whether you&apos;re reading them or not.
        </h2>
        <p style={{ fontSize: 17, color: "var(--muted)", maxWidth: 520, margin: "0 auto 24px" }}>
          The next breaking change is already in someone&apos;s release notes. Get on
          the list and catch it before it catches you.
        </p>
        <a className="btn lg" href="/sign-in">Get early access</a>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 14 }}>
          One email a day. Instant Slack alerts on reds. Cancel anytime.
        </p>
      </section>
    </main>
  );
}

// Mirrors the actual digest email the product sends — not a fake app screenshot.
function SampleDigest() {
  return (
    <div className="card" style={{ padding: "8px 20px 12px" }}>
      <p style={{ fontSize: 13, color: "var(--muted)", padding: "10px 0 2px", margin: 0 }}>
        Today in your stack
      </p>
      <DigestItem color="red" vendor="Anthropic" text="A model you use is scheduled for deprecation." />
      <DigestItem color="red" vendor="Stripe" text="Breaking change to the Checkout API next version." />
      <DigestItem color="yellow" vendor="Supabase" text="New connection pooler defaults rolling out." />
      <DigestItem color="green" vendor="Vercel" text="Dashboard UI refresh, no action needed." />
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
  name, price, lines, recommended,
}: { name: string; price: string; lines: string[]; recommended?: boolean }) {
  return (
    <div className="card" style={{ border: `1px solid ${recommended ? "var(--accent)" : "var(--line)"}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <h3 style={{ margin: 0 }}>{name}</h3>
        {recommended && <span className="badge">Recommended</span>}
      </div>
      <p style={{ fontSize: 30, margin: "0 0 14px" }}>{price}</p>
      <ul style={{ margin: 0, paddingLeft: 18, color: "var(--muted)", display: "grid", gap: 6 }}>
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <div style={{ marginTop: 18 }}>
        <a className={`btn${recommended ? "" : " ghost"}`} href="/sign-in">Get early access</a>
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
