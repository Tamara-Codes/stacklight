// The whole signup funnel, server-side. There are no accounts or passwords:
// subscribing is giving us an email and a stack. This route is PUBLIC — it
// takes an email + the chosen vendor ids, creates (or re-uses) the user by
// email, saves their stack, and emails them a welcome with their private
// manage link. From here on the daily digest cron finds them automatically.
//
// Uses the service-role client (no RLS): the browser has no Supabase client and
// never touches the tables directly. Idempotent on email — re-subscribing with
// the same address updates the existing user's stack rather than duplicating.
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/db/admin";
import { buildWelcomeEmail } from "@/lib/email/digest";
import { sendEmail } from "@/lib/email/client";
import { isDiscordWebhookUrl } from "@/lib/discord/webhook";
import { manageUrl, signUserId } from "@/lib/tokens";

const BASE = process.env.PUBLIC_BASE_URL ?? "https://stacklight.nosastra.co";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const { email, vendorIds, instantEmail, discordWebhook } = (await req.json()) as {
    email?: string;
    vendorIds?: number[];
    instantEmail?: boolean;
    discordWebhook?: string;
  };

  const address = String(email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(address)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  const ids = Array.isArray(vendorIds) ? [...new Set(vendorIds.filter((n) => Number.isInteger(n)))] : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "Pick at least one tool." }, { status: 400 });
  }

  // Only keep ids that are real vendors — never trust the client's numbers.
  const { data: realVendors } = await supabaseAdmin
    .from("vendors")
    .select("id")
    .in("id", ids);
  const validIds = (realVendors ?? []).map((v) => v.id);
  if (validIds.length === 0) {
    return NextResponse.json({ error: "Pick at least one tool." }, { status: 400 });
  }

  const webhookUrl = String(discordWebhook ?? "").trim();
  if (webhookUrl && !isDiscordWebhookUrl(webhookUrl)) {
    return NextResponse.json({ error: "That doesn't look like a Discord webhook URL." }, { status: 400 });
  }

  // Find or create the user by email. We never rotate an existing user's id
  // (it's the FK target for their stack/deliveries/alerts), so select first.
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", address)
    .maybeSingle();

  const userId = existing?.id ?? randomUUID();
  if (!existing) {
    const { error } = await supabaseAdmin.from("users").insert({ id: userId, email: address });
    if (error) return NextResponse.json({ error: "Could not create your subscription." }, { status: 500 });
  } else {
    // Re-subscribing clears any prior unsubscribe so digests resume.
    await supabaseAdmin.from("users").update({ unsubscribed_at: null }).eq("id", userId);
  }

  // Replace the stack wholesale with the chosen tools.
  await supabaseAdmin.from("user_stacks").delete().eq("user_id", userId);
  await supabaseAdmin
    .from("user_stacks")
    .insert(validIds.map((vendor_id) => ({ user_id: userId, vendor_id })));

  // Initial instant-alert choices. The daily digest is always sent to the
  // address above; these rows only enable the optional real-time red alerts.
  if (instantEmail) {
    await supabaseAdmin
      .from("alert_channels")
      .upsert({ user_id: userId, kind: "email", target: null }, { onConflict: "user_id,kind" });
  }
  if (webhookUrl) {
    await supabaseAdmin
      .from("alert_channels")
      .upsert({ user_id: userId, kind: "discord", target: webhookUrl }, { onConflict: "user_id,kind" });
  }

  // Welcome email with the manage link. Best-effort: a send failure shouldn't
  // lose the subscription they just made.
  try {
    const { subject, html } = buildWelcomeEmail({
      manageUrl: manageUrl(BASE, userId),
      unsubscribeUrl: `${BASE}/api/unsubscribe?u=${userId}&t=${signUserId(userId)}`,
      toolCount: validIds.length,
    });
    await sendEmail({ to: address, subject, html });
  } catch (e) {
    console.error("welcome email failed:", e);
  }

  return NextResponse.json({ ok: true, userId, token: signUserId(userId) });
}
