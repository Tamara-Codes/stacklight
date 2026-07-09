"use client";

// The vendor picker. Tap the tools you follow; each tap saves instantly.
// Starter is capped at STARTER_LIMIT tools (enforced here, not in the DB — see
// db/schema.sql). Full Stack ('pro') and the 14-day trial are unlimited: the
// trial is the full product, and the size of the stack a user builds here is
// exactly what makes the Starter-vs-Full-Stack choice obvious at checkout.
// RLS guarantees a user can only touch their own rows even though this runs
// in the browser.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/db/supabase";
import { useAuthedUserContext } from "@/lib/context/AuthedUserContext";

const STARTER_LIMIT = 10;

interface Vendor {
  id: number;
  slug: string;
  name: string;
}

// Our vendor slugs don't all match Simple Icons' slugs — map the ones that differ.
// Anything still missing falls back to a letter monogram (see VendorBubble).
const ICON_SLUG: Record<string, string> = {
  nextjs: "nextdotjs",
  nodejs: "nodedotjs",
  "google-cloud": "googlecloud",
  flyio: "flydotio",
  aws: "amazonwebservices",
};

function iconUrl(slug: string) {
  // e7e9ee = --text, so marks read as light-on-dark.
  return `https://cdn.simpleicons.org/${ICON_SLUG[slug] ?? slug}/e7e9ee`;
}

export default function StackPage() {
  const router = useRouter();
  const { userId, plan, trialActive } = useAuthedUserContext();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: vendorRows }, { data: stack }] = await Promise.all([
        supabase.from("vendors").select("id, slug, name").order("name"),
        supabase.from("user_stacks").select("vendor_id").eq("user_id", userId),
      ]);

      setVendors(vendorRows ?? []);
      setSelected(new Set((stack ?? []).map((r) => r.vendor_id)));
      setLoading(false);
    })();
  }, [userId]);

  // Unlimited on Full Stack and during the trial; only Starter (and expired
  // trials that never picked a plan) hit the cap.
  const unlimited = plan === "pro" || trialActive;
  const atLimit = !unlimited && selected.size >= STARTER_LIMIT;

  async function toggle(vendorId: number) {
    const next = new Set(selected);
    if (next.has(vendorId)) {
      next.delete(vendorId);
      setSelected(next);
      await supabase.from("user_stacks").delete().match({ user_id: userId, vendor_id: vendorId });
    } else {
      if (atLimit) return; // Starter is capped; the UI nudges to upgrade instead of toggling.
      next.add(vendorId);
      setSelected(next);
      await supabase.from("user_stacks").insert({ user_id: userId, vendor_id: vendorId });
    }
  }

  if (loading) return <main className="container" style={{ paddingTop: 96 }}>Loading…</main>;

  return (
    <main className="container" style={{ paddingTop: 56, paddingBottom: 110, textAlign: "center" }}>
      <h1 style={{ fontSize: 30, margin: 0 }}>Build your stack</h1>

      <div style={{ marginTop: 16 }}>
        <span className="count-pill">
          {selected.size}{unlimited ? "" : ` / ${STARTER_LIMIT}`}
        </span>
      </div>

      {atLimit && (
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 16, maxWidth: 360, marginLeft: "auto", marginRight: "auto", lineHeight: 1.5 }}>
          {plan === "starter" ? (
            <>Starter tracks up to {STARTER_LIMIT} tools. <a href="/account">Upgrade to Full Stack</a> for an unlimited stack.</>
          ) : (
            <>Your free trial has ended. <a href="/account">Pick a plan</a> to keep tracking your stack.</>
          )}
        </p>
      )}

      <div className="bubble-cloud">
        {vendors.map((v, i) => (
          <VendorBubble
            key={v.id}
            vendor={v}
            on={selected.has(v.id)}
            disabled={atLimit && !selected.has(v.id)}
            // Stagger the bob so the cloud drifts rather than pulsing in unison.
            delay={(i % 8) * 0.45}
            duration={6 + (i % 4)}
            onToggle={() => toggle(v.id)}
          />
        ))}
      </div>

      <div style={{ marginTop: 40 }}>
        <button className="btn lg" disabled={selected.size === 0} onClick={() => router.push("/dashboard")}>
          Done
        </button>
        {selected.size === 0 && (
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 10 }}>
            Pick at least one tool to continue.
          </p>
        )}
      </div>
    </main>
  );
}

function VendorBubble({
  vendor, on, disabled, delay, duration, onToggle,
}: {
  vendor: Vendor;
  on: boolean;
  disabled?: boolean;
  delay: number;
  duration: number;
  onToggle: () => void;
}) {
  const [broken, setBroken] = useState(false);

  return (
    <div className="bubble-float" style={{ animationDelay: `${delay}s`, animationDuration: `${duration}s` }}>
      <button
        type="button"
        className={`bubble${on ? " on" : ""}`}
        aria-pressed={on}
        title={disabled ? `Starter is capped at ${STARTER_LIMIT} tools` : vendor.name}
        disabled={disabled}
        onClick={onToggle}
      >
        <span className="bubble-art">
          {broken ? (
            <span className="bubble-mono">{vendor.name.charAt(0)}</span>
          ) : (
            <img src={iconUrl(vendor.slug)} alt="" onError={() => setBroken(true)} />
          )}
        </span>
        <span className="bubble-name">{vendor.name}</span>
        {on && <span className="bubble-check" aria-hidden>✓</span>}
      </button>
    </div>
  );
}
