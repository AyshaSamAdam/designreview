"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { takePendingInvite } from "@/lib/pending-invite";

type User = { name: string };

export function DashboardShell({ children }: { children: React.ReactNode }) {

  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {


    let cancelled = false;

    async function loadUser() {
      try {
        const response = await apiFetch("/auth/me");

        if (response.status === 401) {
          router.push("/sign-in");
          return;
        }

        if (!response.ok) {
          if (!cancelled) setError("Something went wrong loading your account.");
          return;
        }

        const data = await response.json();
        // if (!cancelled) setUser(data.user ?? data);
        if (cancelled) return;

         const pending = takePendingInvite();
                if (pending) {
                router.replace(`/invite/${pending}`);
                return;
                }

                setUser(data.user ?? data);
      } catch {
        if (!cancelled) setError("Can't reach the server. Check your connection and try again.");
      }
    }


    loadUser();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSignOut() {
    setSigningOut(true);
    setError(null);

    try {
      const response = await apiFetch("/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("logout failed");
      router.push("/sign-in");
    } catch {
      setError("Couldn't sign out. Please try again.");
      setSigningOut(false);
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-void px-6">
        {error ? (
          <p role="alert" className="rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">
            {error}
          </p>
        ) : (
          <p className="text-sm text-ink-dim">Loading...</p>
        )}
      </div>
    );
  }

  const firstName = user.name.split(" ")[0];

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line/80 bg-void/90 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4" aria-label="Dashboard">
          <Link href="/dashboard" className="font-display text-lg font-semibold tracking-tight">
            DesignReview
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-ink-dim sm:block">{user.name}</span>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="rounded-xl border border-line bg-panel px-4 py-2 font-sans text-sm font-medium shadow-sm transition hover:border-brand/30 hover:bg-elevated disabled:opacity-60"
            >
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
        {error && (
          <p role="alert" className="mb-6 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">
            {error}
          </p>
        )}
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Welcome back, {firstName}</h1>
        {children}
      </main>
    </>
  );
}