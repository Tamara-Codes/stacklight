// The one server-side definition of "does this user get the product": a
// trialing/active subscription plan, or a still-running signup trial (users
// row created ≤14 days ago with no plan picked yet). Shared by the digest
// dispatch, the red-alert fan-out, and the Slack connect gate so they can't
// drift apart. ('founder' is a legacy paid value — see normalizePlan in
// lib/hooks/useAuthedUser.ts, the client-side counterpart of this.)
const SUBSCRIBED = new Set(["starter", "pro", "founder"]);

export function hasAccess(u: { plan?: string | null; trial_ends_at?: string | null }): boolean {
  if (SUBSCRIBED.has(u.plan ?? "")) return true;
  return !!u.trial_ends_at && new Date(u.trial_ends_at).getTime() > Date.now();
}
