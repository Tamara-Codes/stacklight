"use client";

// Sign in — passwordless. Magic link by email, or one-click GitHub. Both redirect
// back to /stack, where the browser client picks up the session automatically.
import { useState } from "react";
import { supabase } from "@/lib/db/supabase";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/stack` },
    });
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  async function signInWithGitHub() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${location.origin}/stack` },
    });
    if (error) setError(error.message);
  }

  return (
    <main className="container" style={{ paddingTop: 96, maxWidth: 420 }}>
      <h1 style={{ fontSize: 28 }}>Sign in to Stack Digest</h1>
      {sent ? (
        <p style={{ color: "var(--muted)" }}>
          Check your inbox — we sent a magic link to <strong>{email}</strong>.
        </p>
      ) : (
        <>
          <form onSubmit={sendMagicLink} style={{ display: "grid", gap: 12, marginTop: 16 }}>
            <input
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ padding: 12, borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--text)" }}
            />
            <button className="btn" type="submit">Email me a magic link</button>
          </form>
          {error && (
            <p role="alert" style={{ color: "#ef4444", fontSize: 14, marginTop: 12 }}>
              {error}
            </p>
          )}
          <p style={{ textAlign: "center", color: "var(--muted)", margin: "16px 0" }}>or</p>
          <button className="btn" style={{ width: "100%", background: "var(--panel)", color: "var(--text)", border: "1px solid var(--line)" }} onClick={signInWithGitHub}>
            Continue with GitHub
          </button>
        </>
      )}
    </main>
  );
}
