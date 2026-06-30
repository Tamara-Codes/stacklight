"use client";

// The one settings page. Tap the tools you follow; each tap saves instantly.
// No tier caps yet — pick as many as you like. RLS guarantees a user can only
// touch their own rows even though this runs in the browser.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/db/supabase";

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
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        location.href = "/sign-in";
        return;
      }
      const uid = session.user.id;
      setUserId(uid);

      // Make sure a users row exists (mirrors the auth user).
      await supabase.from("users").upsert(
        { id: uid, email: session.user.email },
        { onConflict: "id", ignoreDuplicates: true }
      );

      const [{ data: vendorRows }, { data: stack }] = await Promise.all([
        supabase.from("vendors").select("id, slug, name").order("name"),
        supabase.from("user_stacks").select("vendor_id").eq("user_id", uid),
      ]);

      setVendors(vendorRows ?? []);
      setSelected(new Set((stack ?? []).map((r) => r.vendor_id)));
      setLoading(false);
    })();
  }, []);

  async function toggle(vendorId: number) {
    if (!userId) return;
    const next = new Set(selected);
    if (next.has(vendorId)) {
      next.delete(vendorId);
      setSelected(next);
      await supabase.from("user_stacks").delete().match({ user_id: userId, vendor_id: vendorId });
    } else {
      next.add(vendorId);
      setSelected(next);
      await supabase.from("user_stacks").insert({ user_id: userId, vendor_id: vendorId });
    }
  }

  if (loading) return <main className="container" style={{ paddingTop: 96 }}>Loading…</main>;

  if (done) {
    return (
      <main className="container" style={{ paddingTop: 110, paddingBottom: 120, textAlign: "center" }}>
        <div className="done-check" aria-hidden>✓</div>
        <h1 style={{ fontSize: 30, margin: "22px 0 0" }}>You&apos;re all set</h1>
        <p style={{ color: "var(--muted)", maxWidth: 440, margin: "10px auto 24px" }}>
          We&apos;re watching {selected.size} tool{selected.size === 1 ? "" : "s"} for you. Your first
          digest lands tomorrow morning — reds first.
        </p>
        <button className="btn ghost" onClick={() => setDone(false)}>Edit your stack</button>
      </main>
    );
  }

  return (
    <main className="container" style={{ paddingTop: 56, paddingBottom: 110, textAlign: "center" }}>
      <h1 style={{ fontSize: 30, margin: 0 }}>Build your stack</h1>
      <p style={{ color: "var(--muted)", maxWidth: 460, margin: "10px auto 0" }}>
        Tap the tools you use. We&apos;ll watch them and flag what matters.
      </p>

      <div style={{ marginTop: 16 }}>
        <span className="count-pill">{selected.size} selected</span>
      </div>

      <div className="bubble-cloud">
        {vendors.map((v, i) => (
          <VendorBubble
            key={v.id}
            vendor={v}
            on={selected.has(v.id)}
            // Stagger the bob so the cloud drifts rather than pulsing in unison.
            delay={(i % 8) * 0.45}
            duration={6 + (i % 4)}
            onToggle={() => toggle(v.id)}
          />
        ))}
      </div>

      <div style={{ marginTop: 40 }}>
        <button className="btn lg" disabled={selected.size === 0} onClick={() => setDone(true)}>
          Next
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
  vendor, on, delay, duration, onToggle,
}: {
  vendor: Vendor;
  on: boolean;
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
        title={vendor.name}
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
