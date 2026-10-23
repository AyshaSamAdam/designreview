import Link from "next/link";
import type { Metadata } from "next";
import { TextField } from "@/components/ui/text-filed";
import { SignInForm } from "@/components/auth/sign-in-form";
import { RedirectIfSignedIn } from "@/components/auth/redirect-if-signed-in";

export const metadata: Metadata = {
  title: "Sign in | DesignReview",
};

const errorMessages: Record<string, string> = {
  google_failed: "Google sign-in didn't work. Please try again.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const errorMessage = error ? errorMessages[error] : undefined;
  const googleUrl = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <RedirectIfSignedIn />
      <div className="w-full max-w-sm rounded-3xl border border-line bg-panel p-8 shadow-[0_24px_70px_-44px_rgba(32,47,45,0.34)] sm:p-9">
        <Link href="/" className="text-sm text-ink-dim transition-colors hover:text-ink">
          ← Back to home
        </Link>

        <h1 className="mt-7 font-display text-3xl font-semibold tracking-tight">Sign in to DesignReview</h1>
        <p className="mt-2 text-sm leading-6 text-ink-dim">Pick up where you left off, or start a new room.</p>

        {errorMessage && (
          <p role="alert" className="mt-5 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">
            {errorMessage}
          </p>
        )}

        <a
          href={googleUrl}
          className="mt-6 flex w-full items-center justify-center rounded-xl border border-line bg-panel px-4 py-3 font-sans text-sm font-medium shadow-sm transition hover:border-brand/30 hover:bg-elevated"
        >
          Continue with Google
        </a>

        <div className="my-6 flex items-center gap-3 text-xs text-ink-faint">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>

        <SignInForm />

        <p className="mt-6 text-center text-sm text-ink-dim">
          No account?{" "}
          <Link href="/sign-up" className="text-brand hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}