// Stripe client. Billing UI is entirely Stripe-hosted (Checkout + Customer
// Portal) — we never build payment screens, we just create sessions and react
// to webhooks.
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const PRICES = {
  solo: process.env.STRIPE_PRICE_SOLO!,
  founder: process.env.STRIPE_PRICE_FOUNDER!,
};
