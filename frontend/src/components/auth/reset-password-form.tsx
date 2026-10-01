"use client";

import { useState } from "react";
import Link from "next/link";
import { TextField } from "../ui/text-filed";


export function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [linkBad, setLinkBad] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    if (newPassword !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setPending(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      if (response.ok) {
        setDone(true);
      } else if (response.status === 400) {
        setLinkBad(true);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch {
      setError("Can't reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div role="status" className="space-y-4 text-sm">
        <p className="rounded-lg border border-good/40 bg-good/10 px-3 py-2 text-good">
          Your password has been updated. You have been signed out everywhere, so sign in again.
        </p>
        <Link href="/sign-in" className="text-brand hover:underline">
          Go to sign in
        </Link>
      </div>
    );
  }

  if (linkBad) {
    return (
      <div className="space-y-4 text-sm">
        <p role="alert" className="rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-bad">
          This reset link is invalid or has expired.
        </p>
        <Link href="/forgot-password" className="text-brand hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TextField
        id="password"
        label="NEW PASSWORD"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="At least 8 characters."
      />
      <TextField
        id="confirm"
        label="CONFIRM PASSWORD"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
      />

      {error && (
        <p role="alert" className="rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand px-5 py-2.5 font-mono text-sm font-medium text-void transition-colors hover:bg-brand/90 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Set new password"}
      </button>
    </form>
  );
}