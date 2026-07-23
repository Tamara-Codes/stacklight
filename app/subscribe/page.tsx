"use client";

// The signup funnel — no account, no password. Pick your tools, give us an
// email, done. Three steps in one page: pick → email → confirmed. The stack
// lives in React state until the final POST; nothing is written until they
// give an email. Identity from here on is the signed manage link we email them.
import { useEffect, useState } from "react";
import Link from "next/link";
import { StackPicker, type Vendor } from "@/components/StackPicker";

type Step = "pick" | "email" | "done";

export default function SubscribePage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("pick");
  const [email, setEmail] = useState("");
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
      body: JSON.stringify({ email: email.trim(), vendorIds: [...selected] }),
    });
    const body = await res.json();
    if (body.ok) {
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
          has a link to add tools or turn on instant alerts anytime.
        </p>
        <Link className="btn lg" href="/" style={{ marginTop: 24 }}>Back to home</Link>
      </main>
    );
  }

  return (
    <main className="container" style={{ paddingTop: 56, paddingBottom: 110, textAlign: "center" }}>
      <h1 style={{ fontSize: 30, margin: 0 }}>Build your stack</h1>
      <p style={{ color: "var(--muted)", marginTop: 10 }}>
        Tap every tool you want watched.
      </p>

      <div style={{ marginTop: 16 }}>
        <span className="count-pill">{selected.size}</span>
      </div>

      <StackPicker vendors={vendors} selected={selected} onToggle={toggle} />

      {step === "pick" ? (
        <div style={{ marginTop: 40 }}>
          <button className="btn lg" disabled={selected.size === 0} onClick={() => setStep("email")}>
            Continue
          </button>
          {selected.size === 0 && (
            <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 10 }}>
              Pick at least one tool to continue.
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={submit} style={{ marginTop: 40, maxWidth: 380, marginLeft: "auto", marginRight: "auto" }}>
          <p style={{ margin: "0 0 12px", fontSize: 15 }}>Where do we send your digest?</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={{ flex: 1, minWidth: 220, padding: 12, borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--text)" }}
            />
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Setting up…" : "Subscribe"}
            </button>
          </div>
          <button
            type="button"
            className="btn ghost"
            style={{ marginTop: 12 }}
            onClick={() => { setStep("pick"); setError(null); }}
            disabled={busy}
          >
            ← Back to tools
          </button>
          {error && <p role="alert" style={{ color: "var(--red)", fontSize: 14, marginTop: 12 }}>{error}</p>}
        </form>
      )}
    </main>
  );
}
