"use client";

// The signup funnel — no account, no password. Pick your tools, give us an
// email and alert choices, done. Three steps in one page: pick → alerts →
// confirmed. The stack lives in React state until the final POST; nothing is
// written until they give an email. Identity from here on is the signed manage
// link we email them.
import { useEffect, useState } from "react";
import Link from "next/link";
import { IconBrandDiscord, IconBrandSlack, IconMail } from "@tabler/icons-react";
import { StackPicker, type Vendor } from "@/components/StackPicker";

type Step = "pick" | "alerts" | "done";

export default function SubscribePage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("pick");
  const [email, setEmail] = useState("");
  const [instantEmail, setInstantEmail] = useState(false);
  const [slackAlerts, setSlackAlerts] = useState(false);
  const [discordAlerts, setDiscordAlerts] = useState(false);
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/vendors");
      const body = await res.json();
      setVendors(body.vendors ?? []);
      setLoading(false);
    })();
  }, []);

  function toggle(vendorId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(vendorId)) next.delete(vendorId);
      else next.add(vendorId);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        vendorIds: [...selected],
        instantEmail,
        discordWebhook: discordAlerts ? discordWebhook.trim() : "",
      }),
    });
    const body = await res.json();
    if (body.ok) {
      if (slackAlerts) {
        const slackRes = await fetch(`/api/slack?u=${encodeURIComponent(body.userId)}&t=${encodeURIComponent(body.token)}`, { method: "POST" });
        const slackBody = await slackRes.json();
        if (slackBody.url) { window.location.href = slackBody.url; return; }
        setError(slackBody.error ?? "Your subscription is saved, but we couldn't start the Slack connection. Use the link in your welcome email to try again.");
        setBusy(false);
        return;
      }
      setStep("done");
    } else {
      setError(body.error ?? "Something went wrong.");
      setBusy(false);
    }
  }

  if (loading) return <main className="container" style={{ paddingTop: 96 }}>Loading…</main>;

  if (step === "done") {
    return (
      <main className="container" style={{ paddingTop: 96, paddingBottom: 96, textAlign: "center", maxWidth: 520 }}>
        <h1 style={{ fontSize: 30, margin: "0 0 12px" }}>You&rsquo;re in.</h1>
        <p style={{ color: "var(--muted)", fontSize: 17, lineHeight: 1.6 }}>
          Check <strong style={{ color: "var(--text)" }}>{email}</strong> for a welcome
          note. Your first digest lands tomorrow morning, reds first. The email
          has a link to adjust your stack and alerts anytime.
        </p>
        <Link className="btn lg" href="/" style={{ marginTop: 24 }}>Back to home</Link>
      </main>
    );
  }

  return (
    <main className="container subscribe-page" style={{ textAlign: "center" }}>
      {step === "pick" ? (
        <>
          <h1 style={{ fontSize: 30, margin: 0 }}>Build your stack</h1>
          <p style={{ color: "var(--muted)", marginTop: 10 }}>
            Tap every tool you want watched.
          </p>

          <div style={{ marginTop: 16 }}>
            <span className="count-pill">{selected.size}</span>
          </div>

          <StackPicker vendors={vendors} selected={selected} onToggle={toggle} />

          <div style={{ marginTop: 40 }}>
            <button className="btn lg" disabled={selected.size === 0} onClick={() => setStep("alerts")}>
              Continue
            </button>
            {selected.size === 0 && (
              <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 10 }}>
                Pick at least one tool to continue.
              </p>
            )}
          </div>
        </>
      ) : (
        <form className="subscribe-alerts" onSubmit={submit}>
          <h1 style={{ fontSize: 30, margin: 0 }}>Choose your alerts</h1>
          <p style={{ color: "var(--muted)", margin: "10px 0 24px" }}>
            Your daily Stacklight update goes to the email address below. Choose any channels for immediate red alerts.
          </p>

          <div className="subscribe-channel-grid" role="group" aria-label="Alert channels">
            <button
              type="button"
              className={`subscribe-channel${instantEmail ? " on" : ""}`}
            aria-pressed={instantEmail}
            onClick={() => setInstantEmail((value) => !value)}
          >
              <span className="subscribe-channel-heading"><IconMail size={22} stroke={1.8} /><strong>Email</strong></span>
              <span>Send immediate red alerts to this inbox.</span>
            </button>
            <button
              type="button"
              className={`subscribe-channel${slackAlerts ? " on" : ""}`}
            aria-pressed={slackAlerts}
              onClick={() => setSlackAlerts((value) => !value)}
            >
              <span className="subscribe-channel-heading"><IconBrandSlack size={22} stroke={1.8} /><strong>Slack</strong></span>
              <span>Authorize your workspace after you continue.</span>
            </button>
            <button
              type="button"
              className={`subscribe-channel${discordAlerts ? " on" : ""}`}
            aria-pressed={discordAlerts}
            onClick={() => setDiscordAlerts((value) => !value)}
          >
              <span className="subscribe-channel-heading"><IconBrandDiscord size={22} stroke={1.8} /><strong>Discord</strong></span>
              <span>Send red alerts through a webhook.</span>
            </button>
          </div>

          <label className="subscribe-field">
            <span>Email for your daily Stacklight update</span>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </label>

          {discordAlerts && (
            <label className="subscribe-field">
              <span>Discord webhook</span>
              <input
                type="url"
                required
                value={discordWebhook}
                onChange={(e) => setDiscordWebhook(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
              />
            </label>
          )}

          <div className="subscribe-alert-actions">
            <button className="btn lg" type="submit" disabled={busy}>
              {busy ? "Setting up…" : slackAlerts ? "Continue to connect Slack" : "Continue"}
            </button>
            <button type="button" className="linklike" onClick={() => { setStep("pick"); setError(null); }} disabled={busy}>
              Back to stack
            </button>
          </div>
          {error && <p role="alert" style={{ color: "var(--red)", fontSize: 14, marginTop: 12 }}>{error}</p>}
        </form>
      )}
    </main>
  );
}
