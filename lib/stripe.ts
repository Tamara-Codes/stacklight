// Stripe client. Billing UI is entirely Stripe-hosted (Checkout + Customer
// Portal) — we never build payment screens, we just create sessions and react
// to webhooks.
//
// Lazy singleton: `next build` evaluates route modules while collecting page
// data, and a module-level `new Stripe(...)` made every build require
// STRIPE_SECRET_KEY. Constructing on first use keeps secrets a runtime-only
// concern; a missing key still fails loudly on the first real request.
import Stripe from "stripe";

let client: Stripe | null = null;
export function getStripe(): Stripe {
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY!);
  return client;
}

// Two paid plans, split by stack size only (features are identical): Starter
// watches up to 10 tools, Full Stack ('pro') is unlimited. No free tier — entry
// is the 14-day in-app trial that starts at signup (users.trial_ends_at);
// Stripe only enters when the user picks a plan, card required, no Stripe trial.
export const PRICES = {
  starter: process.env.STRIPE_PRICE_STARTER!,
  pro: process.env.STRIPE_PRICE_PRO!,
};
