"use client";

// Shared "am I logged in" check for every page under app/(app). Redirects to
// /sign-in if there's no session, upserts the mirrored `users` row on first
// login (which is also what starts the 14-day trial — trial_ends_at defaults
// to now()+14d in the DB), and returns the bits every authed page needs.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/db/supabase";

export interface AuthedUser {
  userId: string;
  email: string;
  // 'none' = no (trialing or paid) subscription — but they may still be inside
  // the signup trial; check trialActive before gating anything on plan.
  plan: "none" | "starter" | "pro";
  // True while plan is 'none' and trial_ends_at is in the future. During the
  // trial everything behaves like Full Stack; the plan choice comes at checkout.
  trialActive: boolean;
  trialDaysLeft: number; // 0 when the trial is over or a plan is active
}

// Rows written before the Starter/Full Stack restructure may still hold legacy
// values; only 'founder' ever paid for unlimited access.
function normalizePlan(plan: string | null | undefined): "none" | "starter" | "pro" {
  if (plan === "pro" || plan === "founder") return "pro";
  if (plan === "starter") return "starter";
  return "none";
}

export function useAuthedUser() {
  const [user, setUser] = useState<AuthedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        location.href = "/sign-in";
        return;
      }
      const uid = session.user.id;
      const email = session.user.email ?? "";

      await supabase.from("users").upsert(
        { id: uid, email },
        { onConflict: "id", ignoreDuplicates: true }
      );

      const { data: me } = await supabase
        .from("users")
        .select("plan, trial_ends_at")
        .eq("id", uid)
        .single();

      const plan = normalizePlan(me?.plan);
      const msLeft = me?.trial_ends_at ? new Date(me.trial_ends_at).getTime() - Date.now() : 0;
      const trialActive = plan === "none" && msLeft > 0;

      setUser({
        userId: uid,
        email,
        plan,
        trialActive,
        trialDaysLeft: trialActive ? Math.max(1, Math.ceil(msLeft / 86_400_000)) : 0,
      });
      setLoading(false);
    })();
  }, []);

  return { user, loading };
}
