// The two no-OAuth red-alert channels: email (sent to the account address) and
// Discord (a user-supplied incoming webhook). Slack lives in /api/slack because
// it carries the Composio OAuth dance; these two are simple rows in
// alert_channels, so they share one small route.
//
//   GET    — { email: boolean, discord: { connected: boolean } }
//   PUT    — { channel: 'email' } enables email;
//            { channel: 'discord', webhookUrl } saves/updates the webhook.
//   DELETE — ?channel=email|discord turns that channel off.
//
// No login: identity is the signed (u, t) token from the /manage link (same as
// /api/slack). Writes use the service-role client (alert_channels has
// select-only RLS).
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/admin";
import { isDiscordWebhookUrl } from "@/lib/discord/webhook";
import { verifyUserId } from "@/lib/tokens";

// Verified user id from the (u, t) query params, or null.
function authed(req: NextRequest): string | null {
  const u = req.nextUrl.searchParams.get("u") ?? "";
  const t = req.nextUrl.searchParams.get("t") ?? "";
  return u && t && verifyUserId(u, t) ? u : null;
}

export async function GET(req: NextRequest) {
  const userId = authed(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: rows } = await supabaseAdmin
    .from("alert_channels")
    .select("kind")
    .eq("user_id", userId)
    .in("kind", ["email", "discord"]);

  const kinds = new Set((rows ?? []).map((r) => r.kind));
  return NextResponse.json({
    email: kinds.has("email"),
    discord: { connected: kinds.has("discord") },
  });
}

export async function PUT(req: NextRequest) {
  const userId = authed(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { channel, webhookUrl } = (await req.json()) as {
    channel?: string;
    webhookUrl?: string;
  };

  if (channel === "email") {
    await supabaseAdmin
      .from("alert_channels")
      .upsert(
        { user_id: userId, kind: "email", target: null },
        { onConflict: "user_id,kind", ignoreDuplicates: true }
      );
    return NextResponse.json({ email: true });
  }

  if (channel === "discord") {
    const url = String(webhookUrl ?? "").trim();
    if (!isDiscordWebhookUrl(url)) {
      return NextResponse.json(
        { error: "That doesn't look like a Discord webhook URL." },
        { status: 400 }
      );
    }
    await supabaseAdmin
      .from("alert_channels")
      .upsert(
        { user_id: userId, kind: "discord", target: url },
        { onConflict: "user_id,kind" }
      );
    return NextResponse.json({ discord: { connected: true } });
  }

  return NextResponse.json({ error: "Unknown channel." }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const userId = authed(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const channel = req.nextUrl.searchParams.get("channel");
  if (channel !== "email" && channel !== "discord") {
    return NextResponse.json({ error: "Unknown channel." }, { status: 400 });
  }

  await supabaseAdmin
    .from("alert_channels")
    .delete()
    .match({ user_id: userId, kind: channel });

  return channel === "email"
    ? NextResponse.json({ email: false })
    : NextResponse.json({ discord: { connected: false } });
}
