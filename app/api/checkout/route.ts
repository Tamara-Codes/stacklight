// Start a Stripe Checkout session. The client sends its Supabase access token;
// we verify it server-side (never trust a user id from the browser), then create
// a hosted Checkout page for the chosen plan and return its URL.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/admin";
import { stripe, PRICES } from "@/lib/stripe";

const BASE = process.env.PUBLIC_BASE_URL ?? "https://stackdigest.eu";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { plan } = (await req.json()) as { plan: "solo" | "founder" };
  const price = PRICES[plan];
  if (!price) return NextResponse.json({ error: "bad plan" }, { status: 400 });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    customer_email: user.email,
    client_reference_id: user.id, // ties the payment back to our user on the webhook
    success_url: `${BASE}/stack?upgraded=1`,
    cancel_url: `${BASE}/stack`,
  });

  return NextResponse.json({ url: session.url });
}
