// The daily digest, done as fan-out (not a loop). Two functions:
//
//   dispatchDigests   — runs once on a cron. Finds eligible users and emits ONE
//                       event per user. Cheap and fast; does no sending itself.
//   sendUserDigest    — runs once PER event, with capped concurrency + retries.
//                       Builds and sends one user's email. If user #73,402 fails,
//                       only that job retries — the other 99,999 are untouched.
//
// This is why it scales: the slow/fragile work (sending) is spread across many
// isolated, retryable jobs instead of one giant for-loop that dies halfway.
import { inngest } from "@/lib/inngest/client";
import { supabaseAdmin } from "@/lib/db/admin";
import { buildDigestEmail, type DigestEntry } from "@/lib/email/digest";
import { sendEmail } from "@/lib/email/client";
import { unsubToken } from "@/lib/tokens";

const BASE = process.env.PUBLIC_BASE_URL ?? "https://stacklight.tamara.rocks";

export const dispatchDigests = inngest.createFunction(
  { id: "dispatch-digests" },
  { cron: "0 8 * * *" }, // 08:00 daily
  async ({ step }) => {
    // Compute the date ONCE here and pass it down, so every per-user job uses
    // the same dedupe key even if it retries hours later.
    const date = new Date().toISOString().slice(0, 10);

    const eligible = await step.run("eligible-users", async () => {
      // The product is free for everyone, so every user who hasn't unsubscribed
      // gets the digest. Paginate — Supabase caps a single response at ~1000
      // rows, and at 100k users we can't pull them all at once.
      const all: { id: string }[] = [];
      const page = 1000;
      for (let from = 0; ; from += page) {
        const { data } = await supabaseAdmin
          .from("users")
          .select("id")
          .is("unsubscribed_at", null)
          .range(from, from + page - 1);
        if (!data?.length) break;
        all.push(...data);
        if (data.length < page) break;
      }
      return all;
    });

    // Fan out: one event per user. Inngest queues and runs them with the
    // concurrency limit set on sendUserDigest below.
    const events = eligible.map((u) => ({
      name: "digest/user.requested" as const,
      data: { userId: u.id, date },
    }));
    for (let i = 0; i < events.length; i += 500) {
      await step.run(`send-events-${i}`, () => inngest.send(events.slice(i, i + 500)));
    }

    return { dispatched: events.length, date };
  }
);

export const sendUserDigest = inngest.createFunction(
  { id: "send-user-digest", concurrency: { limit: 50 }, retries: 3 },
  { event: "digest/user.requested" },
  async ({ event, step }) => {
    const { userId, date } = event.data as { userId: string; date: string };
    const dedupeKey = `digest:${date}`;

    // Idempotency backstop: if we already logged this digest for this user/day,
    // do nothing. Protects against a re-dispatch sending a second copy.
    const already = await step.run("already-sent?", async () => {
      const { data } = await supabaseAdmin
        .from("deliveries")
        .select("id")
        .match({ user_id: userId, dedupe_key: dedupeKey })
        .maybeSingle();
      return !!data;
    });
    if (already) return { skipped: "already-sent" };

    // Build this user's digest: rated entries from the last 24h, only for the
    // vendors in their stack. This is the cheap per-user read.
    const payload = await step.run("build", async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: user } = await supabaseAdmin
        .from("users").select("email").eq("id", userId).single();
      const { data: stack } = await supabaseAdmin
        .from("user_stacks").select("vendor_id").eq("user_id", userId);

      const vendorIds = (stack ?? []).map((s) => s.vendor_id);
      if (!user?.email || vendorIds.length === 0) return null;

      const { data: entries } = await supabaseAdmin
        .from("entries")
        .select("id, severity, why, title, url, vendors(name)")
        .in("vendor_id", vendorIds)
        .in("severity", ["red", "yellow", "green"]) // excludes unrated (null) AND "skip"
        .gte("published_at", since)
        .order("published_at", { ascending: false });

      // supabase-js can't infer the vendors(name) join without generated DB types.
      const rows = (entries ?? []) as unknown as {
        id: number;
        severity: DigestEntry["severity"];
        why: string;
        title: string;
        url: string | null;
        vendors: { name: string } | null;
      }[];
      const digestEntries: (DigestEntry & { id: number })[] = rows.map((e) => ({
        id: e.id,
        severity: e.severity,
        why: e.why,
        title: e.title,
        url: e.url,
        vendor: e.vendors?.name ?? "Unknown",
      }));

      return { email: user.email, entries: digestEntries };
    });

    // Nothing new for this user today — don't send an empty email.
    if (!payload || payload.entries.length === 0) return { skipped: "no-entries" };

    // Send. Inngest memoizes a successful step, so a later retry of a *different*
    // step won't re-send this email.
    await step.run("send", async () => {
      const token = unsubToken(userId);
      const { subject, html } = buildDigestEmail({
        entries: payload.entries,
        manageUrl: `${BASE}/manage?u=${userId}&t=${token}`,
        unsubscribeUrl: `${BASE}/api/unsubscribe?u=${userId}&t=${token}`,
        date,
      });
      await sendEmail({ to: payload.email, subject, html });
    });

    // Record it (the idempotency log + audit trail) AND exactly which entries
    // went into it, so Archive can show the literal digest later rather than
    // reconstructing a guess from the user's (possibly since-changed) stack.
    await step.run("record", async () => {
      const { data: delivery } = await supabaseAdmin
        .from("deliveries")
        .insert({ user_id: userId, kind: "digest", dedupe_key: dedupeKey })
        .select("id")
        .single();
      if (delivery) {
        await supabaseAdmin.from("delivery_entries").insert(
          payload.entries.map((e) => ({ delivery_id: delivery.id, entry_id: e.id }))
        );
      }
    });

    return { sent: true };
  }
);
