"use client";

// The chrome the authed app was missing: who you're signed in as, where you
// are, and a way out. Shared by every page under app/(app).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/db/supabase";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/archive", label: "Archive" },
  { href: "/stack", label: "Stack" },
  { href: "/account", label: "Account" },
];

export function AppHeader({ email }: { email: string }) {
  const pathname = usePathname();

  async function signOut() {
    await supabase.auth.signOut();
    location.href = "/";
  }

  return (
    <header className="app-header">
      <div className="container wide app-header-inner">
        <Link href="/dashboard" className="app-logo">Stacklight</Link>
        <nav className="app-nav">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={pathname === l.href ? "on" : ""}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="app-account">
          <span className="app-email">{email}</span>
          <button className="btn ghost" onClick={signOut}>Sign out</button>
        </div>
      </div>
    </header>
  );
}
