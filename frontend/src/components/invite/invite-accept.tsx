"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { savePendingInvite } from "@/lib/pending-invite";

type Status = "joining" | "invalid" | "failed";

export function InviteAccept({ code }: { code: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("joining");

  useEffect(() => {
    let cancelled = false;

    async function accept() {
      try {
        const response = await apiFetch("/diagrams/invites/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: code }),
        });

        if (cancelled) return;

        if (response.status === 401) {
          savePendingInvite(code);
          router.replace("/sign-in");
          return;
        }

        if (response.status === 404) {
          setStatus("invalid");
          return;
        }

        if (!response.ok) {
          setStatus("failed");
          return;
        }

        const { diagramId } = await response.json();
        if (!cancelled) router.replace(`/room/${diagramId}`);
      } catch {
        if (!cancelled) setStatus("failed");
      }
    }

    accept();

    return () => {
      cancelled = true;
    };
  }, [code, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-void px-6 text-ink">
      <div className="w-full max-w-sm text-center">
        {status === "joining" && (
          <p role="status" className="text-sm text-ink-dim">
            Joining the diagram...
          </p>
        )}

        {status === "invalid" && (
          <>
            <h1 className="font-display text-xl font-semibold">This invite link does not work</h1>
            <p className="mt-2 text-sm text-ink-dim">
              It may have expired or been mistyped. Ask the owner to send you a new one.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-block rounded-lg border border-line px-4 py-2 font-mono text-sm hover:bg-elevated"
            >
              Go to dashboard
            </Link>
          </>
        )}

        {status === "failed" && (
          <>
            <h1 className="font-display text-xl font-semibold">Something went wrong</h1>
            <p className="mt-2 text-sm text-ink-dim">
              We could not reach the server. Check your connection and try again.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-lg border border-line px-4 py-2 font-mono text-sm hover:bg-elevated"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </main>
  );
}