"use client";

// The vendor picker cloud, shared by the public /subscribe funnel and the
// token-authed /manage page. Pure presentation: it owns no data, just renders
// the vendors and the current selection and calls back on toggle. The product
// is free with unlimited tools, so there's no cap here.
import { useState } from "react";

export interface Vendor {
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

export function StackPicker({
  vendors,
  selected,
  onToggle,
}: {
  vendors: Vendor[];
  selected: Set<number>;
  onToggle: (vendorId: number) => void;
}) {
  return (
    <div className="bubble-cloud">
      {vendors.map((v, i) => (
        <VendorBubble
          key={v.id}
          vendor={v}
          on={selected.has(v.id)}
          // Stagger the bob so the cloud drifts rather than pulsing in unison.
          delay={(i % 8) * 0.45}
          duration={6 + (i % 4)}
          onToggle={() => onToggle(v.id)}
        />
      ))}
    </div>
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
