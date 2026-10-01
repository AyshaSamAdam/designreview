"use client";

import { useState } from "react";
import Link from "next/link";
import { TextField } from "../ui/text-filed";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email") }),
      });

      if (response.ok) {
        setSent(true);
      } else if (response.status === 400) {
        setError("Please enter a valid email address.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch {
      setError("Can't reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div role="status" className="space-y-4 text-sm">
        <p className="rounded-lg border border-good/40 bg-good/10 px-3 py-2 text-good">
          If an account exists for that email, we have sent a reset link. It expires in 1 hour.
        </p>
        <p className="text-ink-dim">
          Nothing in your inbox? Check your spam folder, or try again in a few minutes.
        </p>
        <Link href="/sign-in" className="text-brand hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TextField id="email" label="EMAIL" type="email" autoComplete="email" placeholder="you@example.com" required />

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
        {pending ? "Sending..." : "Send reset link"}
      </button>
    </form>
  );
}