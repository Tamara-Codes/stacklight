// Stripe webhook — the source of truth for who has paid. Stripe calls this when
// a subscription is created, updated, or canceled; we update users.plan and the
// subscriptions table accordingly. Always verify the signature against the raw
// body, or anyone could POST themselves a free Founder plan.
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/db/admin";

const SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text(); // raw body required for signature verification
  const sig = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `bad signature: ${message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId = s.client_reference_id;
      // Default to "starter" (least privilege) if the metadata is ever missing —
      // never let a malformed event silently grant an unlimited stack.
      const plan = s.metadata?.plan === "pro" ? "pro" : "starter";
      if (userId) {
        // current_period_end lives on the Subscription, not the Checkout Session.
        const subscription = await getStripe().subscriptions.retrieve(s.subscription as string);
        await supabaseAdmin.from("subscriptions").upsert({
          user_id: userId,
          stripe_customer_id: s.customer as string,
          stripe_subscription_id: s.subscription as string,
          status: "active",
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        });
        await supabaseAdmin.from("users").update({ plan }).eq("id", userId);
      }
      break;
    }
    case "customer.subscription.deleted":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const active = sub.status === "active" || sub.status === "trialing";
      const plan = sub.metadata?.plan === "pro" ? "pro" : "starter";
      const { data: row } = await supabaseAdmin
        .from("subscriptions")
        .update({
          status: sub.status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        })
        .eq("stripe_subscription_id", sub.id)
        .select("user_id")
        .maybeSingle();
      if (row?.user_id) {
        // Canceled, paused, or lapsed subscribers drop to 'none' (no digests).
        await supabaseAdmin
          .from("users")
          .update({ plan: active ? plan : "none" })
          .eq("id", row.user_id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
