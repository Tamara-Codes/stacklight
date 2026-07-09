// Opens a Stripe-hosted billing portal session. Mirrors /api/checkout: the
// client sends its Supabase access token, we verify it server-side and look
// up the Stripe customer ourselves — never trust a customer id from the browser.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/admin";
import { getStripe } from "@/lib/stripe";

const BASE = process.env.PUBLIC_BASE_URL ?? "https://stackdigest.eu";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ error: "no subscription" }, { status: 400 });
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${BASE}/account`,
  });

  return NextResponse.json({ url: session.url });
}
