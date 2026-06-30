// Stripe webhook — the source of truth for who has paid. Stripe calls this when
// a subscription is created, updated, or canceled; we update users.plan and the
// subscriptions table accordingly. Always verify the signature against the raw
// body, or anyone could POST themselves a free Founder plan.
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/db/admin";

const SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text(); // raw body required for signature verification
  const sig = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, SECRET);
  } catch (err: any) {
    return NextResponse.json({ error: `bad signature: ${err.message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId = s.client_reference_id;
      if (userId) {
        await supabaseAdmin.from("subscriptions").upsert({
          user_id: userId,
          stripe_customer_id: s.customer as string,
          stripe_subscription_id: s.subscription as string,
          status: "active",
        });
        await supabaseAdmin.from("users").update({ plan: "founder" }).eq("id", userId);
      }
      break;
    }
    case "customer.subscription.deleted":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const active = sub.status === "active" || sub.status === "trialing";
      const { data: row } = await supabaseAdmin
        .from("subscriptions")
        .update({ status: sub.status })
        .eq("stripe_subscription_id", sub.id)
        .select("user_id")
        .maybeSingle();
      if (row?.user_id) {
        await supabaseAdmin
          .from("users")
          .update({ plan: active ? "founder" : "solo" })
          .eq("id", row.user_id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
