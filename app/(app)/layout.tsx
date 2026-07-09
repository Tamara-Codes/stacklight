"use client";

// Shared shell for every authenticated page (dashboard, stack, archive,
// account). Does the session check once and renders the header — pages below
// no longer need to redo either.
import { AuthedUserProvider, useAuthedUserContext } from "@/lib/context/AuthedUserContext";
import { AppHeader } from "@/components/AppHeader";

function Shell({ children }: { children: React.ReactNode }) {
  const user = useAuthedUserContext();
  return (
    <>
      <AppHeader email={user.email} />
      {children}
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthedUserProvider>
      <Shell>{children}</Shell>
    </AuthedUserProvider>
  );
}
