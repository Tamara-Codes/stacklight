"use client";

// Post-login home. Replaces the old fake "you're all set" screen with real
// content: the stack you follow, a live feed of what's actually happened on
// it, and a glance at your plan/next digest.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/db/supabase";
import { useAuthedUserContext } from "@/lib/context/AuthedUserContext";

type Severity = "red" | "yellow" | "green";

interface FeedEntry {
  id: number;
  severity: Severity;
  why: string;
  title: string;
  url: string | null;
  published_at: string;
  vendor: string;
}

// Shapes of the joined selects below — supabase-js can't infer joins without
// generated DB types, so we assert them once here.
interface StackRow {
  vendor_id: number;
  vendors: { name: string } | null;
}

interface EntryRow {
  id: number;
  severity: Severity;
  why: string;
  title: string;
  url: string | null;
  published_at: string;
  vendors: { name: string } | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const { userId, plan, trialActive, trialDaysLeft } = useAuthedUserContext();
  const [vendorNames, setVendorNames] = useState<string[]>([]);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: stack } = await supabase
        .from("user_stacks")
        .select("vendor_id, vendors(name)")
        .eq("user_id", userId);

      const vendorIds = (stack ?? []).map((s) => s.vendor_id);

      // Nobody's picked a tool yet — the picker is more useful than an empty dashboard.
      if (vendorIds.length === 0) {
        router.replace("/stack");
        return;
      }

      setVendorNames(
        ((stack ?? []) as unknown as StackRow[])
          .map((s) => s.vendors?.name)
          .filter((n): n is string => Boolean(n))
      );

      const { data: entries } = await supabase
        .from("entries")
        .select("id, severity, why, title, url, published_at, vendors(name)")
        .in("vendor_id", vendorIds)
        .in("severity", ["red", "yellow", "green"])
        .order("published_at", { ascending: false })
        .limit(20);

      setFeed(
        ((entries ?? []) as unknown as EntryRow[]).map((e) => ({
          id: e.id,
          severity: e.severity,
          why: e.why,
          title: e.title,
          url: e.url,
          published_at: e.published_at,
          vendor: e.vendors?.name ?? "Unknown",
        }))
      );
      setLoading(false);
    })();
  }, [userId, router]);

  if (loading) return <main className="container" style={{ paddingTop: 96 }}>Loading…</main>;

  return (
    <main className="container wide" style={{ paddingTop: 40, paddingBottom: 96 }}>
      <h1 style={{ fontSize: 28, margin: 0 }}>Dashboard</h1>

      <div className="dash-grid" style={{ marginTop: 24 }}>
        <div className="stack" style={{ gap: 16 }}>
          <div className="card">
            <p className="eyebrow" style={{ margin: "0 0 10px" }}>Recent activity</p>
            {feed.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 14 }}>
                Nothing rated yet for your stack. Check back tomorrow morning.
              </p>
            ) : (
              feed.map((e) => (
                <div key={e.id} className="digest-row">
                  <span className={`dot ${e.severity}`} />
                  <div>
                    <div style={{ fontSize: 14 }}>
                      <strong style={{ fontWeight: 600 }}>{e.vendor}</strong>{" "}
                      {e.url ? (
                        <a href={e.url} target="_blank" rel="noreferrer">{e.title}</a>
                      ) : (
                        e.title
                      )}
                    </div>
                    <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>{e.why}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <div className="card">
            <p className="eyebrow" style={{ margin: "0 0 10px" }}>Your stack</p>
            <p style={{ fontSize: 14, color: "var(--text)", margin: 0 }}>
              {vendorNames.join(", ")}
            </p>
            <a href="/stack" style={{ fontSize: 13, display: "inline-block", marginTop: 10 }}>Edit your stack →</a>
          </div>

          <div className="card">
            <p className="eyebrow" style={{ margin: "0 0 10px" }}>Next digest</p>
            <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>
              {plan === "none" && !trialActive
                ? "Pick a plan to get the daily email."
                : "Runs daily at 08:00 UTC — reds first."}
            </p>
          </div>

          <div className="card">
            <p className="eyebrow" style={{ margin: "0 0 10px" }}>Plan</p>
            <p style={{ fontSize: 14, margin: 0 }}>
              {plan === "pro"
                ? "Full Stack"
                : plan === "starter"
                ? "Starter"
                : trialActive
                ? `Free trial · ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left`
                : "Trial ended"}
            </p>
            <a href="/account" style={{ fontSize: 13, display: "inline-block", marginTop: 10 }}>
              {plan === "none" ? "Pick a plan →" : "Manage billing →"}
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
