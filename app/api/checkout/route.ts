// Start a Stripe Checkout session. The client sends its Supabase access token;
// we verify it server-side (never trust a user id from the browser), then create
// a hosted Checkout page for the chosen plan and return its URL.
//
// No Stripe trial here: the 14-day trial happens in-app before any plan is
// chosen (users.trial_ends_at — see db/schema.sql). By the time someone reaches
// this checkout they've already had the free ride, so this collects a card and
// charges immediately. That day-14 decision is the validation signal.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/admin";
import { getStripe, PRICES } from "@/lib/stripe";

const BASE = process.env.PUBLIC_BASE_URL ?? "https://stackdigest.eu";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { plan } = (await req.json()) as { plan: "starter" | "pro" };
  const price = PRICES[plan];
  if (!price) return NextResponse.json({ error: "bad plan" }, { status: 400 });

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    customer_email: user.email,
    client_reference_id: user.id, // ties the payment back to our user on the webhook
    metadata: { plan }, // read back in checkout.session.completed
    subscription_data: {
      metadata: { plan }, // carried onto the Subscription for later events
    },
    success_url: `${BASE}/account?upgraded=1`,
    cancel_url: `${BASE}/account`,
  });

  return NextResponse.json({ url: session.url });
}
