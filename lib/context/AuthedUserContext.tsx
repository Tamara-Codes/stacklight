"use client";

// Shares the one useAuthedUser() fetch across every page under app/(app), so
// Dashboard/Archive/Account/Stack don't each redo the session + plan lookup.
import { createContext, useContext } from "react";
import { useAuthedUser, type AuthedUser } from "@/lib/hooks/useAuthedUser";

const AuthedUserContext = createContext<AuthedUser | null>(null);

export function AuthedUserProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthedUser();

  if (loading || !user) {
    return <main className="container" style={{ paddingTop: 96 }}>Loading…</main>;
  }

  return <AuthedUserContext.Provider value={user}>{children}</AuthedUserContext.Provider>;
}

export function useAuthedUserContext(): AuthedUser {
  const user = useContext(AuthedUserContext);
  if (!user) throw new Error("useAuthedUserContext must be used within AuthedUserProvider");
  return user;
}
