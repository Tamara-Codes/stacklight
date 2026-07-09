"use client";

// Email, plan, subscription status, and a way to actually manage billing —
// none of which existed anywhere in the app before this.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/db/supabase";
import { useAuthedUserContext } from "@/lib/context/AuthedUserContext";

interface Subscription {
  status: string;
  current_period_end: string | null;
}

interface SlackState {
  connected: boolean;
  channel: string;
}

// Every alert-channel call carries the access token, same as the billing
// routes. /api/slack owns the Slack OAuth channel; /api/alerts owns the simpler
// email + Discord channels.
async function authedApi(
  path: string,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  body?: object
) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${session?.access_token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
}

const slackApi = (method: "GET" | "POST" | "PATCH" | "DELETE", body?: object) =>
  authedApi("/api/slack", method, body);

export default function AccountPage() {
  const { userId, email, plan, trialActive, trialDaysLeft } = useAuthedUserContext();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slack, setSlack] = useState<SlackState | null>(null);
  const [channelDraft, setChannelDraft] = useState("general");
  const [slackBusy, setSlackBusy] = useState(false);
  const [slackError, setSlackError] = useState<string | null>(null);

  // The two no-OAuth alert channels (email + Discord), from /api/alerts.
  const [emailAlerts, setEmailAlerts] = useState<boolean | null>(null);
  const [discord, setDiscord] = useState<boolean | null>(null);
  const [webhookDraft, setWebhookDraft] = useState("");
  const [alertsBusy, setAlertsBusy] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  const hasAccess = plan !== "none" || trialActive;

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("user_id", userId)
        .maybeSingle();
      setSub(data);
      setLoading(false);
    })();
  }, [userId]);

  // The /api/slack GET also finishes the OAuth flow: coming back from Slack
  // there's an ACTIVE Composio connection but no alert_channels(slack) row yet,
  // and the API adopts it on this read. /api/alerts GET loads email + Discord.
  useEffect(() => {
    if (!hasAccess) return;
    (async () => {
      const [slackBody, alertsBody] = await Promise.all([
        slackApi("GET"),
        authedApi("/api/alerts", "GET"),
      ]);
      if (typeof slackBody.connected === "boolean") {
        setSlack({ connected: slackBody.connected, channel: slackBody.channel ?? "general" });
        setChannelDraft(slackBody.channel ?? "general");
      }
      if (typeof alertsBody.email === "boolean") setEmailAlerts(alertsBody.email);
      if (typeof alertsBody.discord?.connected === "boolean") setDiscord(alertsBody.discord.connected);
    })();
  }, [hasAccess]);

  async function connectSlack() {
    setSlackError(null);
    setSlackBusy(true);
    const body = await slackApi("POST");
    if (body.url) {
      location.href = body.url; // off to Slack's consent screen
      return;
    }
    if (body.connected) {
      // Composio already had an active connection — adopted server-side.
      setSlack({ connected: true, channel: channelDraft });
    } else {
      setSlackError(body.error ?? "Something went wrong.");
    }
    setSlackBusy(false);
  }

  async function saveChannel() {
    setSlackError(null);
    setSlackBusy(true);
    const body = await slackApi("PATCH", { channel: channelDraft });
    if (body.channel) {
      setSlack({ connected: true, channel: body.channel });
      setChannelDraft(body.channel);
    } else {
      setSlackError(body.error ?? "Something went wrong.");
    }
    setSlackBusy(false);
  }

  async function disconnectSlack() {
    setSlackError(null);
    setSlackBusy(true);
    const body = await slackApi("DELETE");
    if (body.error) {
      setSlackError(body.error);
    } else {
      setSlack({ connected: false, channel: "general" });
      setChannelDraft("general");
    }
    setSlackBusy(false);
  }

  async function toggleEmailAlerts(next: boolean) {
    setAlertsError(null);
    setEmailAlerts(next); // optimistic
    const body = next
      ? await authedApi("/api/alerts", "PUT", { channel: "email" })
      : await authedApi("/api/alerts?channel=email", "DELETE");
    if (body?.error) {
      setAlertsError(body.error);
      setEmailAlerts(!next); // roll back
    }
  }

  async function saveDiscord() {
    setAlertsError(null);
    setAlertsBusy(true);
    const body = await authedApi("/api/alerts", "PUT", { channel: "discord", webhookUrl: webhookDraft.trim() });
    if (body.discord?.connected) {
      setDiscord(true);
      setWebhookDraft("");
    } else {
      setAlertsError(body.error ?? "Something went wrong.");
    }
    setAlertsBusy(false);
  }

  async function removeDiscord() {
    setAlertsError(null);
    setAlertsBusy(true);
    const body = await authedApi("/api/alerts?channel=discord", "DELETE");
    if (body.error) {
      setAlertsError(body.error);
    } else {
      setDiscord(false);
    }
    setAlertsBusy(false);
  }

  // Both billing actions work the same way: POST with the access token, get a
  // Stripe-hosted URL back, go there. Checkout for starting a trial, Portal for
  // managing (including switching plans) once a subscription exists.
  async function goToStripe(
    endpoint: "/api/checkout" | "/api/billing-portal",
    checkoutPlan?: "starter" | "pro"
  ) {
    setError(null);
    setPortalLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token}` },
      body: checkoutPlan ? JSON.stringify({ plan: checkoutPlan }) : undefined,
    });
    const body = await res.json();
    if (body.url) {
      location.href = body.url;
    } else {
      setError(body.error ?? "Something went wrong.");
      setPortalLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    location.href = "/";
  }

  if (loading) return <main className="container" style={{ paddingTop: 96 }}>Loading…</main>;

  return (
    <main className="container" style={{ paddingTop: 40, paddingBottom: 96 }}>
      <h1 style={{ fontSize: 28, margin: 0 }}>Account</h1>

      <div className="card" style={{ marginTop: 24 }}>
        <p className="eyebrow" style={{ margin: "0 0 4px" }}>Email</p>
        <p style={{ margin: "0 0 18px" }}>{email}</p>

        <p className="eyebrow" style={{ margin: "0 0 4px" }}>Plan</p>
        <p style={{ margin: "0 0 18px" }}>
          {plan === "pro"
            ? "Full Stack"
            : plan === "starter"
            ? "Starter"
            : trialActive
            ? "Free trial"
            : "Trial ended"}
          <span style={{ color: "var(--muted)", fontSize: 14 }}>
            {plan === "pro" && " · unlimited tools"}
            {plan === "starter" && " · up to 10 tools"}
            {plan === "none" && trialActive &&
              ` · everything unlocked, ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left`}
            {plan === "none" && !trialActive && " · pick a plan to restart your digests"}
          </span>
        </p>

        <p className="eyebrow" style={{ margin: "0 0 4px" }}>Subscription</p>
        <p style={{ margin: "0 0 18px", color: sub ? "var(--text)" : "var(--muted)" }}>
          {sub
            ? `${sub.status}${sub.current_period_end ? ` · renews ${new Date(sub.current_period_end).toLocaleDateString()}` : ""}`
            : "No active subscription."}
        </p>

        {sub && plan !== "none" ? (
          <button className="btn" onClick={() => goToStripe("/api/billing-portal")} disabled={portalLoading}>
            {portalLoading ? "Opening…" : "Manage billing"}
          </button>
        ) : (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="btn ghost" onClick={() => goToStripe("/api/checkout", "starter")} disabled={portalLoading}>
              {portalLoading ? "Opening…" : "Starter · €5/mo"}
            </button>
            <button className="btn" onClick={() => goToStripe("/api/checkout", "pro")} disabled={portalLoading}>
              {portalLoading ? "Opening…" : "Full Stack · €10/mo"}
            </button>
          </div>
        )}
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 12, marginBottom: 0 }}>
          {!sub && "Starter tracks up to 10 tools, Full Stack is unlimited — same product otherwise. Cancel anytime."}
        </p>
        {error && <p role="alert" style={{ color: "var(--red)", fontSize: 14, marginTop: 12 }}>{error}</p>}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <p className="eyebrow" style={{ margin: "0 0 4px" }}>Instant red alerts</p>
        <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 4px" }}>
          You always get the daily digest by email. Turn on any of these for an
          instant ping the moment a red lands — outages and breaking changes,
          while they&apos;re happening.
        </p>

        {!hasAccess ? (
          <p style={{ color: "var(--muted)", margin: "14px 0 0" }}>
            Pick a plan above to enable instant alerts.
          </p>
        ) : (
          <>
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
          </>
        )}
      </div>

      <button className="btn ghost" style={{ marginTop: 16 }} onClick={signOut}>Sign out</button>
    </main>
  );
}
