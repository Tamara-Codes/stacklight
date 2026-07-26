// Slack connection management for the "instant red alerts" feature.
// Composio hosts the OAuth flow; these handlers start it, mirror the result
// into alert_channels (kind='slack': target=channel, account_id=Composio id),
// and let the user pick a channel or disconnect. Email and Discord alert
// channels are managed separately in /api/alerts.
//
//   GET    — connection status. Also reconciles with Composio: when the OAuth
//            redirect lands the user back on /manage we don't have a row yet,
//            so a GET that finds an ACTIVE Composio account adopts it. This IS
//            the callback half of the connect flow.
//   POST   — start the OAuth flow; returns { url } to send the browser to.
//   PATCH  — { channel }: change where alerts go.
//   DELETE — disconnect (revoke in Composio, drop our row).
//
// No login: identity is the signed (u, t) token from the /manage link (same
// token as unsubscribe — see lib/tokens.ts). Never trust a bare user id.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/admin";
import {
  createSlackConnectLink,
  getActiveSlackAccountId,
  deleteSlackAccount,
} from "@/lib/slack/composio";
import { verifyUserId, signUserId } from "@/lib/tokens";

const BASE = process.env.PUBLIC_BASE_URL ?? "https://stacklight.nosastra.co";

// Verified user id from the (u, t) query params, or null.
function authed(req: NextRequest): string | null {
  const u = req.nextUrl.searchParams.get("u") ?? "";
  const t = req.nextUrl.searchParams.get("t") ?? "";
  return u && t && verifyUserId(u, t) ? u : null;
}

export async function GET(req: NextRequest) {
  const userId = authed(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: row } = await supabaseAdmin
    .from("alert_channels")
    .select("target")
    .match({ user_id: userId, kind: "slack" })
    .maybeSingle();
  if (row) return NextResponse.json({ connected: true, channel: row.target ?? "general" });

  // No local row — adopt an ACTIVE Composio connection if the OAuth flow just
  // finished. Upsert keeps a double-fired GET (React strict mode) harmless.
  const accountId = await getActiveSlackAccountId(userId);
  if (!accountId) return NextResponse.json({ connected: false });

  const { data: created } = await supabaseAdmin
    .from("alert_channels")
    .upsert(
      { user_id: userId, kind: "slack", target: "general", account_id: accountId },
      { onConflict: "user_id,kind" }
    )
    .select("target")
    .single();
  return NextResponse.json({ connected: true, channel: created?.target ?? "general" });
}

export async function POST(req: NextRequest) {
  const userId = authed(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Already connected in Composio (stale local state)? Adopt instead of
  // starting a second flow — link() refuses duplicates on one auth config.
  const existing = await getActiveSlackAccountId(userId);
  if (existing) {
    // Sync the Composio account id without clobbering a previously-saved
    // channel: update in place if the row exists, otherwise insert with the
    // default channel.
    const { data: row } = await supabaseAdmin
      .from("alert_channels")
      .select("user_id")
      .match({ user_id: userId, kind: "slack" })
      .maybeSingle();
    if (row) {
      await supabaseAdmin
        .from("alert_channels")
        .update({ account_id: existing })
        .match({ user_id: userId, kind: "slack" });
    } else {
      await supabaseAdmin
        .from("alert_channels")
        .insert({ user_id: userId, kind: "slack", target: "general", account_id: existing });
    }
    return NextResponse.json({ connected: true });
  }

  // Send the OAuth callback back to /manage carrying the same signed token, so
  // the returning page can re-authenticate and adopt the fresh connection.
  const callback = `${BASE}/manage?u=${userId}&t=${signUserId(userId)}&slack=connected`;
  const url = await createSlackConnectLink(userId, callback);
  return NextResponse.json({ url });
}

export async function PATCH(req: NextRequest) {
  const userId = authed(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { channel } = (await req.json()) as { channel?: string };
  const clean = String(channel ?? "").trim().replace(/^#/, "");
  if (!clean) return NextResponse.json({ error: "Channel is required." }, { status: 400 });

  const { data: updated } = await supabaseAdmin
    .from("alert_channels")
    .update({ target: clean })
    .match({ user_id: userId, kind: "slack" })
    .select("target")
    .maybeSingle();
  if (!updated) return NextResponse.json({ error: "Slack is not connected." }, { status: 404 });

  return NextResponse.json({ connected: true, channel: updated.target });
}

export async function DELETE(req: NextRequest) {
  const userId = authed(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: row } = await supabaseAdmin
    .from("alert_channels")
    .select("account_id")
    .match({ user_id: userId, kind: "slack" })
    .maybeSingle();

  if (row) {
    // Best-effort revoke: if Composio already dropped the account (revoked
    // from the Slack side), still clear our row so the UI isn't stuck.
    if (row.account_id) {
      try {
        await deleteSlackAccount(row.account_id);
      } catch (e) {
        console.error("composio delete failed:", e);
      }
    }
    await supabaseAdmin.from("alert_channels").delete().match({ user_id: userId, kind: "slack" });
  }

  return NextResponse.json({ connected: false });
}
