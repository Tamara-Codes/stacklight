"use client";

// The whole returning-user experience: edit your stack and your instant-alert
// channels. No login — the page authenticates with the signed (u, t) token from
// the "manage" link in every email (see lib/tokens.ts). Everything reads/writes
// through token-authed server routes; there's no browser Supabase client.
import { useEffect, useState } from "react";
import Link from "next/link";
import { StackPicker, type Vendor } from "@/components/StackPicker";

interface SlackState { connected: boolean; channel: string; }
type ManageTab = "stack" | "alerts";

export default function ManagePage() {
  const [creds, setCreds] = useState<{ u: string; t: string } | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [activeTab, setActiveTab] = useState<ManageTab>("stack");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [stackError, setStackError] = useState<string | null>(null);

  // Alert channels.
  const [emailAlerts, setEmailAlerts] = useState<boolean | null>(null);
  const [slack, setSlack] = useState<SlackState | null>(null);
  const [channelDraft, setChannelDraft] = useState("general");
  const [slackBusy, setSlackBusy] = useState(false);
  const [slackError, setSlackError] = useState<string | null>(null);
  const [discord, setDiscord] = useState<boolean | null>(null);
  const [webhookDraft, setWebhookDraft] = useState("");
  const [alertsBusy, setAlertsBusy] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  // Parse the signed link on mount (client-only — avoids a Suspense boundary).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const u = params.get("u") ?? "";
    const t = params.get("t") ?? "";
    if (!u || !t) { setInvalid(true); setLoading(false); return; }
    setCreds({ u, t });
  }, []);

  const qs = creds ? `u=${encodeURIComponent(creds.u)}&t=${encodeURIComponent(creds.t)}` : "";

  useEffect(() => {
    if (!creds) return;
    (async () => {
      const [vendorsRes, manageRes] = await Promise.all([
        fetch("/api/vendors"),
        fetch(`/api/manage?${qs}`),
      ]);
      if (manageRes.status === 401) { setInvalid(true); setLoading(false); return; }
      const vendorsBody = await vendorsRes.json();
      const manageBody = await manageRes.json();
      setVendors(vendorsBody.vendors ?? []);
      setEmail(manageBody.email ?? "");
      setSelected(new Set<number>(manageBody.vendorIds ?? []));
      setLoading(false);

      // Alert channels (the /api/slack GET also adopts a fresh OAuth connection
      // when we've just come back from Composio with ?slack=connected).
      const [slackBody, alertsBody] = await Promise.all([
        fetch(`/api/slack?${qs}`).then((r) => r.json()),
        fetch(`/api/alerts?${qs}`).then((r) => r.json()),
      ]);
      if (typeof slackBody.connected === "boolean") {
        setSlack({ connected: slackBody.connected, channel: slackBody.channel ?? "general" });
        setChannelDraft(slackBody.channel ?? "general");
      }
      if (typeof alertsBody.email === "boolean") setEmailAlerts(alertsBody.email);
      if (typeof alertsBody.discord?.connected === "boolean") setDiscord(alertsBody.discord.connected);
    })();
  }, [creds, qs]);

  async function toggle(vendorId: number) {
    const next = new Set(selected);
    if (next.has(vendorId)) next.delete(vendorId);
    else next.add(vendorId);
    setSelected(next);
    setStackError(null);
    const res = await fetch(`/api/manage?${qs}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorIds: [...next] }),
    });
    if (!res.ok) setStackError("Couldn't save that change — try again.");
  }

  async function connectSlack() {
    setSlackError(null);
    setSlackBusy(true);
    const body = await fetch(`/api/slack?${qs}`, { method: "POST" }).then((r) => r.json());
    if (body.url) { location.href = body.url; return; }
    if (body.connected) setSlack({ connected: true, channel: channelDraft });
    else setSlackError(body.error ?? "Something went wrong.");
    setSlackBusy(false);
  }

  async function saveChannel() {
    setSlackError(null);
    setSlackBusy(true);
    const body = await fetch(`/api/slack?${qs}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: channelDraft }),
    }).then((r) => r.json());
    if (body.channel) { setSlack({ connected: true, channel: body.channel }); setChannelDraft(body.channel); }
    else setSlackError(body.error ?? "Something went wrong.");
    setSlackBusy(false);
  }

  async function disconnectSlack() {
    setSlackError(null);
    setSlackBusy(true);
    const body = await fetch(`/api/slack?${qs}`, { method: "DELETE" }).then((r) => r.json());
    if (body.error) setSlackError(body.error);
    else { setSlack({ connected: false, channel: "general" }); setChannelDraft("general"); }
    setSlackBusy(false);
  }

  async function toggleEmailAlerts(next: boolean) {
    setAlertsError(null);
    setEmailAlerts(next); // optimistic
    const body = next
      ? await fetch(`/api/alerts?${qs}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel: "email" }) }).then((r) => r.json())
      : await fetch(`/api/alerts?channel=email&${qs}`, { method: "DELETE" }).then((r) => r.json());
    if (body?.error) { setAlertsError(body.error); setEmailAlerts(!next); }
  }

  async function saveDiscord() {
    setAlertsError(null);
    setAlertsBusy(true);
    const body = await fetch(`/api/alerts?${qs}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: "discord", webhookUrl: webhookDraft.trim() }),
    }).then((r) => r.json());
    if (body.discord?.connected) { setDiscord(true); setWebhookDraft(""); }
    else setAlertsError(body.error ?? "Something went wrong.");
    setAlertsBusy(false);
  }

  async function removeDiscord() {
    setAlertsError(null);
    setAlertsBusy(true);
    const body = await fetch(`/api/alerts?channel=discord&${qs}`, { method: "DELETE" }).then((r) => r.json());
    if (body.error) setAlertsError(body.error);
    else setDiscord(false);
    setAlertsBusy(false);
  }

  if (invalid) {
    return (
      <main className="container" style={{ paddingTop: 96, paddingBottom: 96, textAlign: "center", maxWidth: 520 }}>
        <h1 style={{ fontSize: 28, margin: "0 0 12px" }}>This link isn&rsquo;t valid</h1>
        <p style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1.6 }}>
          Open the “manage your stack” link from any Stacklight email to get back
          in. Each email carries a fresh one.
        </p>
        <Link className="btn" href="/" style={{ marginTop: 24 }}>Back to home</Link>
      </main>
    );
  }

  if (loading) return <main className="container" style={{ paddingTop: 96 }}>Loading…</main>;

  return (
    <main className="container manage-page" style={{ paddingTop: 40, paddingBottom: 110 }}>
      <div className="manage-tabs-row">
        <div className="manage-tabs" role="tablist" aria-label="Subscription settings">
          <button
            id="stack-tab"
            className="manage-tab"
            role="tab"
            type="button"
            aria-selected={activeTab === "stack"}
            aria-controls="stack-panel"
            onClick={() => setActiveTab("stack")}
          >
            Stack
          </button>
          <button
            id="alerts-tab"
            className="manage-tab"
            role="tab"
            type="button"
            aria-selected={activeTab === "alerts"}
            aria-controls="alerts-panel"
            onClick={() => setActiveTab("alerts")}
          >
            Alerts
          </button>
        </div>
        <span style={{ color: "var(--muted)", fontSize: 14 }}>{email}</span>
      </div>

      {activeTab === "stack" ? (
        <section id="stack-panel" role="tabpanel" aria-labelledby="stack-tab" style={{ marginTop: 28, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>Your stack</h1>
          <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 14 }}>
            Tap to add or remove. Changes save instantly. {selected.size} selected.
          </p>
          <StackPicker vendors={vendors} selected={selected} onToggle={toggle} />
          {stackError && <p role="alert" style={{ color: "var(--red)", fontSize: 14 }}>{stackError}</p>}
        </section>
      ) : (
      <section id="alerts-panel" role="tabpanel" aria-labelledby="alerts-tab" className="card" style={{ marginTop: 24 }}>
        <p className="eyebrow" style={{ margin: "0 0 4px" }}>Instant red alerts</p>
        <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 4px" }}>
          You always get the daily digest by email. Turn on any of these for an
          instant ping the moment a red lands — outages and breaking changes,
          while they&apos;re happening.
        </p>

        {/* Email */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "18px 0", borderBottom: "1px solid var(--line)" }}>
          <div>
            <p style={{ margin: "0 0 2px", fontWeight: 600 }}>Email</p>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>Reds sent to {email}.</p>
          </div>
          <button
            className={emailAlerts ? "btn" : "btn ghost"}
            onClick={() => toggleEmailAlerts(!emailAlerts)}
            disabled={emailAlerts === null}
          >
            {emailAlerts === null ? "…" : emailAlerts ? "On" : "Off"}
          </button>
        </div>

        {/* Slack */}
        <div style={{ padding: "18px 0", borderBottom: "1px solid var(--line)" }}>
          <p style={{ margin: "0 0 6px", fontWeight: 600 }}>Slack</p>
          {!slack ? (
            <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>Loading…</p>
          ) : slack.connected ? (
            <>
              <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 12px" }}>
                Connected · posted to your workspace the moment a red lands.
              </p>
              <p className="eyebrow" style={{ margin: "0 0 4px" }}>Channel</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <input
                  value={channelDraft}
                  onChange={(e) => setChannelDraft(e.target.value)}
                  placeholder="general"
                  style={{ padding: 12, borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--text)" }}
                />
                <button className="btn" onClick={saveChannel} disabled={slackBusy || channelDraft.trim().replace(/^#/, "") === slack.channel}>
                  {slackBusy ? "Saving…" : "Save"}
                </button>
                <button className="btn ghost" onClick={disconnectSlack} disabled={slackBusy}>Disconnect</button>
              </div>
            </>
          ) : (
            <>
              <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 12px" }}>
                Post reds to a channel in your workspace.
              </p>
              <button className="btn" onClick={connectSlack} disabled={slackBusy}>
                {slackBusy ? "Opening…" : "Connect Slack"}
              </button>
            </>
          )}
          {slackError && <p role="alert" style={{ color: "var(--red)", fontSize: 14, marginTop: 12 }}>{slackError}</p>}
        </div>

        {/* Discord */}
        <div style={{ paddingTop: 18 }}>
          <p style={{ margin: "0 0 6px", fontWeight: 600 }}>Discord</p>
          {discord === null ? (
            <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>Loading…</p>
          ) : discord ? (
            <>
              <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 12px" }}>
                Connected · reds posted through your webhook.
              </p>
              <button className="btn ghost" onClick={removeDiscord} disabled={alertsBusy}>
                {alertsBusy ? "Removing…" : "Remove"}
              </button>
            </>
          ) : (
            <>
              <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 12px" }}>
                Paste an incoming webhook URL (Discord → Server Settings → Integrations → Webhooks).
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <input
                  value={webhookDraft}
                  onChange={(e) => setWebhookDraft(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/…"
                  style={{ flex: 1, minWidth: 240, padding: 12, borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--text)" }}
                />
                <button className="btn" onClick={saveDiscord} disabled={alertsBusy || !webhookDraft.trim()}>
                  {alertsBusy ? "Saving…" : "Save"}
                </button>
              </div>
            </>
          )}
          {alertsError && <p role="alert" style={{ color: "var(--red)", fontSize: 14, marginTop: 12 }}>{alertsError}</p>}
        </div>
      </section>
      )}
    </main>
  );
}
