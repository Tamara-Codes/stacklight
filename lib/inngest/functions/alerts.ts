// Instant alerts on reds, over whichever channels a user turned on (email,
// Slack, Discord — see alert_channels). Same fan-out shape as the daily digest
// (see digest.ts for why):
//
//   dispatchRedAlert  — runs once per fresh red entry (event emitted by the
//                       pollers after rating). Finds the alert-enabled
//                       subscribers who follow that vendor, emits one event each.
//   sendUserRedAlert  — runs once PER (user, entry), with capped concurrency +
//                       retries. Sends to EACH channel the user has enabled.
//
// deliveries' unique (user_id, dedupe_key) with key `alert:<entry_id>:<channel>`
// makes this idempotent end to end, PER CHANNEL: a re-dispatch, a retry, or an
// incident re-rated red after an update can't double-ping any one channel, and
// one channel failing/retrying never re-fires another that already went out.
import { inngest } from "@/lib/inngest/client";
import { supabaseAdmin } from "@/lib/db/admin";
import { sendSlackMessage } from "@/lib/slack/composio";
import { sendDiscordMessage } from "@/lib/discord/webhook";
import { buildRedAlertEmail } from "@/lib/email/digest";
import { sendEmail } from "@/lib/email/client";
import { unsubToken } from "@/lib/tokens";

const BASE = process.env.PUBLIC_BASE_URL ?? "https://stacklight.tamara.rocks";

export const dispatchRedAlert = inngest.createFunction(
  { id: "dispatch-red-alert" },
  { event: "alert/entry.red" },
  async ({ event, step }) => {
    const { entryId } = event.data as { entryId: number };

    // Re-read the entry: by the time this runs the incident may have evolved —
    // a "Resolved" update nulls the rating and it may re-rate to skip/green.
    // Only alert while it's still red; that's when it's worth an interruption.
    const entry = await step.run("load-entry", async () => {
      const { data } = await supabaseAdmin
        .from("entries")
        .select("severity, title, url, why, vendor_id, vendors(name)")
        .eq("id", entryId)
        .maybeSingle();
      // supabase-js can't infer the vendors(name) join without generated DB types.
      return data as unknown as {
        severity: string | null;
        title: string;
        url: string | null;
        why: string | null;
        vendor_id: number;
        vendors: { name: string } | null;
      } | null;
    });
    if (!entry || entry.severity !== "red") return { skipped: "not-red" };

    // Recipients: start from alert_channels — the tiny set of users who turned
    // on at least one alert channel — then intersect with the vendor's
    // followers. Never the other way round: user_stacks for a popular vendor is
    // huge. A user with several channels appears once per channel here, so we
    // dedupe to distinct user ids.
    const userIds = await step.run("recipients", async () => {
      const rows: { user_id: string; users: { unsubscribed_at: string | null } | null }[] = [];
      const page = 1000;
      for (let from = 0; ; from += page) {
        const { data } = await supabaseAdmin
          .from("alert_channels")
          .select("user_id, users!inner(unsubscribed_at)")
          .range(from, from + page - 1);
        if (!data?.length) break;
        rows.push(...(data as unknown as typeof rows));
        if (data.length < page) break;
      }

      // The product is free for everyone, so anyone with an alert channel
      // qualifies — the only filter is the unsubscribe flag, honoured on every
      // send, every channel.
      const eligible = [
        ...new Set(
          rows
            .filter((c) => c.users && !c.users.unsubscribed_at)
            .map((c) => c.user_id)
        ),
      ];
      if (!eligible.length) return [];

      const { data: followers } = await supabaseAdmin
        .from("user_stacks")
        .select("user_id")
        .eq("vendor_id", entry.vendor_id)
        .in("user_id", eligible);
      return (followers ?? []).map((f) => f.user_id);
    });
    if (!userIds.length) return { dispatched: 0 };

    // Fan out with the entry content in the payload (like digest passes the
    // date down): the per-user job shouldn't re-read what can't change per user.
    await step.sendEvent(
      "fan-out",
      userIds.map((userId) => ({
        name: "alert/user.requested" as const,
        data: {
          userId,
          entryId,
          vendor: entry.vendors?.name ?? "Unknown",
          title: entry.title,
          url: entry.url,
          why: entry.why,
        },
      }))
    );
    return { dispatched: userIds.length };
  }
);

export const sendUserRedAlert = inngest.createFunction(
  { id: "send-user-red-alert", concurrency: { limit: 25 }, retries: 3 },
  { event: "alert/user.requested" },
  async ({ event, step }) => {
    const { userId, entryId, vendor, title, url, why } = event.data as {
      userId: string;
      entryId: number;
      vendor: string;
      title: string;
      url: string | null;
      why: string | null;
    };

    // Which channels are on, read at send time (not dispatch time) so a
    // just-toggled channel applies and a just-removed one is skipped. Email
    // also needs the account address. Sorted for a deterministic step order.
    const ctx = await step.run("load-channels", async () => {
      const { data: channels } = await supabaseAdmin
        .from("alert_channels")
        .select("kind, target")
        .eq("user_id", userId);
      const { data: user } = await supabaseAdmin
        .from("users").select("email").eq("id", userId).single();
      const sorted = (channels ?? []).sort((a, b) => a.kind.localeCompare(b.kind));
      return { channels: sorted as { kind: string; target: string | null }[], email: user?.email ?? null };
    });
    if (!ctx.channels.length) return { skipped: "no-channels" };

    const headline = url ? `[${title}](${url})` : title;
    const results: Record<string, string> = {};

    // One independent send per channel. Each is its own dedupe key +
    // memoized steps, so a retry re-sends only the channel that failed.
    for (const ch of ctx.channels) {
      const kind = ch.kind;
      const dedupeKey = `alert:${entryId}:${kind}`;

      const already = await step.run(`already-sent-${kind}?`, async () => {
        const { data } = await supabaseAdmin
          .from("deliveries")
          .select("id")
          .match({ user_id: userId, dedupe_key: dedupeKey })
          .maybeSingle();
        return !!data;
      });
      if (already) { results[kind] = "already-sent"; continue; }

      const sent = await step.run(`send-${kind}`, async () => {
        if (kind === "slack") {
          if (!ch.target) return false;
          await sendSlackMessage(userId, ch.target, `🔴 **${vendor}** — ${headline}${why ? `\n${why}` : ""}`);
          return true;
        }
        if (kind === "discord") {
          if (!ch.target) return false;
          // Discord doesn't linkify [text](url) in content, so show the raw URL.
          const text = `🔴 **${vendor}** — ${title}${url ? `\n${url}` : ""}${why ? `\n${why}` : ""}`;
          await sendDiscordMessage(ch.target, text);
          return true;
        }
        if (kind === "email") {
          if (!ctx.email) return false;
          const { subject, html } = buildRedAlertEmail({
            vendor,
            title,
            url,
            why,
            manageUrl: `${BASE}/manage?u=${userId}&t=${unsubToken(userId)}`,
            unsubscribeUrl: `${BASE}/api/unsubscribe?u=${userId}&t=${unsubToken(userId)}`,
          });
          await sendEmail({ to: ctx.email, subject, html });
          return true;
        }
        return false;
      });
      if (!sent) { results[kind] = "skipped"; continue; }

      // Record per channel: the idempotency log plus the entry link. kind is
      // 'alert' (Archive shows only 'digest', so these don't clutter it).
      await step.run(`record-${kind}`, async () => {
        const { data: delivery } = await supabaseAdmin
          .from("deliveries")
          .insert({ user_id: userId, kind: "alert", dedupe_key: dedupeKey })
          .select("id")
          .single();
        if (delivery) {
          await supabaseAdmin
            .from("delivery_entries")
            .insert({ delivery_id: delivery.id, entry_id: entryId });
        }
      });
      results[kind] = "sent";
    }

    return { results };
  }
);
