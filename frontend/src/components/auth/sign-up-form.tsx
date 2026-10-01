"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TextField } from "../ui/text-filed";


const statusMessages: Record<number, string> = {
  400: "Please check your details. Your password needs at least 8 characters.",
  409: "That email already has an account. Try signing in instead.",
};

export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const email = form.get("email");
    const password = form.get("password");
    const authUrl = process.env.NEXT_PUBLIC_API_URL;

    try {
      const signUp = await fetch(`${authUrl}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.get("name"), email, password }),
      });

      if (!signUp.ok) {
        setError(statusMessages[signUp.status] ?? "Something went wrong. Please try again.");
        return;
      }

      const signIn = await fetch(`${authUrl}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      router.push(signIn.ok ? "/dashboard" : "/sign-in");
    } catch {
      setError("Can't reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TextField id="name" label="NAME" autoComplete="name" placeholder="Ayesha" required />
      <TextField id="email" label="EMAIL" type="email" autoComplete="email" placeholder="you@example.com" required />
      <TextField
        id="password"
        label="PASSWORD"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="At least 8 characters."
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
        {pending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}