"use client";

// Sign in / sign up: email+password or one-click GitHub / Google OAuth.
// Returning sign-ins land on /dashboard; fresh password sign-ups land on
// /stack, since signup starts the 14-day trial and picking tools is the first
// job. (Replaced the original magic-link flow — an inbox round-trip on every
// login was too much friction.)
//
// Supabase sends a confirmation email on password sign-up (when "Confirm
// email" is on in the dashboard); signUp then returns no session and we show
// the check-your-inbox note instead of redirecting.
import { useState } from "react";
import { supabase } from "@/lib/db/supabase";

const inputStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid var(--line)",
  background: "var(--panel)",
  color: "var(--text)",
};

export default function SignIn() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);

    if (mode === "sign-up") {
      // New accounts land on the stack picker: signup started their 14-day
      // trial, so the first job is choosing tools, not reading a dashboard.
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/stack` },
      });
      if (error) {
        setError(error.message);
      } else if (data.session) {
        location.href = "/stack";
        return;
      } else {
        // Email confirmation is on: no session until the link is clicked.
        setNotice(`Almost there — confirm your email via the link we sent to ${email}.`);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        location.href = "/dashboard";
        return;
      }
    }
    setBusy(false);
  }

  async function signInWithProvider(provider: "github" | "google") {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/dashboard` },
    });
    if (error) setError(error.message);
  }

  async function forgotPassword() {
    setError(null);
    setNotice(null);
    if (!email) {
      setError("Enter your email above first, then hit forgot password.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/reset-password`,
    });
    if (error) setError(error.message);
    else setNotice(`Password reset link sent to ${email}.`);
  }

  return (
    <main className="container" style={{ paddingTop: 96, maxWidth: 420 }}>
      <h1 style={{ fontSize: 28 }}>
        {mode === "sign-in" ? "Sign in to Stacklight" : "Create your account"}
      </h1>

      <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
        <button
          className="btn"
          style={{ width: "100%", background: "var(--panel)", color: "var(--text)", borderColor: "var(--line)" }}
          onClick={() => signInWithProvider("github")}
        >
          Continue with GitHub
        </button>
        <button
          className="btn"
          style={{ width: "100%", background: "var(--panel)", color: "var(--text)", borderColor: "var(--line)" }}
          onClick={() => signInWithProvider("google")}
        >
          Continue with Google
        </button>
      </div>

      <p style={{ textAlign: "center", color: "var(--muted)", margin: "16px 0" }}>or</p>

      <form onSubmit={submitPassword} style={{ display: "grid", gap: 12 }}>
        <input
          type="email"
          required
          placeholder="you@company.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Password (8+ characters)"
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "One sec…" : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </form>

      {notice && <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 12 }}>{notice}</p>}
      {error && (
        <p role="alert" style={{ color: "var(--red)", fontSize: 14, marginTop: 12 }}>
          {error}
        </p>
      )}

      <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 20, textAlign: "center" }}>
        {mode === "sign-in" ? (
          <>
            New here?{" "}
            <button className="linklike" onClick={() => { setMode("sign-up"); setError(null); setNotice(null); }}>
              Create an account
            </button>
            {" · "}
            <button className="linklike" onClick={forgotPassword}>Forgot password?</button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button className="linklike" onClick={() => { setMode("sign-in"); setError(null); setNotice(null); }}>
              Sign in
            </button>
          </>
        )}
      </p>
    </main>
  );
}
