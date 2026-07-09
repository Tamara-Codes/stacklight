"use client";

// Landing page for the Supabase password-recovery email. The link in the email
// signs the user in with a temporary recovery session; this page just sets the
// new password on that session and moves on. If the session is missing the
// link expired (or was opened in another browser) — send them back to start over.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/db/supabase";

export default function ResetPassword() {
  const [ready, setReady] = useState<"checking" | "ok" | "no-session">("checking");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setReady(session ? "ok" : "no-session");
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    location.href = "/dashboard";
  }

  return (
    <main className="container" style={{ paddingTop: 96, maxWidth: 420 }}>
      <h1 style={{ fontSize: 28 }}>Set a new password</h1>

      {ready === "checking" && <p style={{ color: "var(--muted)", marginTop: 16 }}>Loading…</p>}

      {ready === "no-session" && (
        <p style={{ color: "var(--muted)", marginTop: 16 }}>
          This reset link has expired or was already used.{" "}
          <a href="/sign-in" style={{ color: "var(--accent)" }}>Request a new one</a>.
        </p>
      )}

      {ready === "ok" && (
        <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <input
            type="password"
            required
            minLength={8}
            placeholder="New password (8+ characters)"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: 12, borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--text)" }}
          />
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save and continue"}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" style={{ color: "var(--red)", fontSize: 14, marginTop: 12 }}>
          {error}
        </p>
      )}
    </main>
  );
}
