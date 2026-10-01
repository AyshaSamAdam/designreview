"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TextField } from "../ui/text-filed";
import Link from "next/link"

const statusMessages: Record<number, string> = {
  400: "Please enter a valid email and password.",
  401: "Wrong email or password.",
  423: "This account is temporarily locked after too many failed attempts. Try again in 15 minutes.",
  429: "Too many attempts. Try again in 15 minutes.",
};

export function SignInForm() {

  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });

      if (response.ok) {
        router.push("/dashboard");
        return;
      }

      setError(statusMessages[response.status] ?? "Something went wrong. Please try again.");
    } catch {
      setError("Can't reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TextField id="email" label="EMAIL" type="email" autoComplete="email" placeholder="you@example.com" required />
      <TextField id="password" label="PASSWORD" type="password" autoComplete="current-password" required />
        <div className="text-fight">
            <Link href="/forgot-password" className="text-xs text-brand hover:underline">
              Forgot password?
            </Link>
        </div>
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
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}