"use client";

// Past digests, exactly as sent — read from delivery_entries (written by
// sendUserDigest at send time), not reconstructed from the user's current
// stack. Deliveries sent before delivery_entries existed have no rows here.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/db/supabase";
import { useAuthedUserContext } from "@/lib/context/AuthedUserContext";

type Severity = "red" | "yellow" | "green";

interface DeliveryEntry {
  severity: Severity;
  why: string;
  title: string;
  url: string | null;
  vendor: string;
}

interface Delivery {
  id: number;
  sent_at: string;
  entries: DeliveryEntry[];
}

// Shape of the joined select below — supabase-js can't infer joins without
// generated DB types, so we assert it once here.
interface DeliveryRow {
  id: number;
  sent_at: string;
  delivery_entries: {
    entries: {
      severity: Severity;
      why: string;
      title: string;
      url: string | null;
      vendors: { name: string } | null;
    } | null;
  }[] | null;
}

export default function ArchivePage() {
  const { userId } = useAuthedUserContext();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("deliveries")
        .select("id, sent_at, delivery_entries(entries(severity, why, title, url, vendors(name)))")
        .eq("user_id", userId)
        .eq("kind", "digest")
        .order("sent_at", { ascending: false })
        .limit(30);

      setDeliveries(
        ((data ?? []) as unknown as DeliveryRow[]).map((d) => ({
          id: d.id,
          sent_at: d.sent_at,
          entries: (d.delivery_entries ?? [])
            .map((de) => de.entries)
            .filter((e): e is NonNullable<typeof e> => e !== null)
            .map((e) => ({
              severity: e.severity,
              why: e.why,
              title: e.title,
              url: e.url,
              vendor: e.vendors?.name ?? "Unknown",
            })),
        }))
      );
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <main className="container" style={{ paddingTop: 96 }}>Loading…</main>;

  return (
    <main className="container" style={{ paddingTop: 40, paddingBottom: 96 }}>
      <h1 style={{ fontSize: 28, margin: 0 }}>Archive</h1>
      <p style={{ color: "var(--muted)", marginTop: 6 }}>Every digest we&rsquo;ve sent you, exactly as sent.</p>

      {deliveries.length === 0 ? (
        <p style={{ color: "var(--muted)", marginTop: 24 }}>No digests sent yet.</p>
      ) : (
        <div className="stack" style={{ gap: 16, marginTop: 24 }}>
          {deliveries.map((d) => (
            <div key={d.id} className="card">
              <p className="eyebrow" style={{ margin: "0 0 10px" }}>
                {new Date(d.sent_at).toLocaleDateString(undefined, {
                  weekday: "long", year: "numeric", month: "long", day: "numeric",
                })}
              </p>
              {d.entries.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 14 }}>No record of this digest&rsquo;s contents.</p>
              ) : (
                d.entries.map((e, i) => (
                  <div key={i} className="digest-row">
                    <span className={`dot ${e.severity}`} />
                    <div>
                      <div style={{ fontSize: 14 }}>
                        <strong style={{ fontWeight: 600 }}>{e.vendor}</strong>{" "}
                        {e.url ? <a href={e.url} target="_blank" rel="noreferrer">{e.title}</a> : e.title}
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>{e.why}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
