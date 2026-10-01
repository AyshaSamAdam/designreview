import Link from "next/link";
import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = {
  title: "Create account | DesignReview",
};

export default function SignUpPage() {
  const googleUrl = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm rounded-xl border border-line bg-panel p-8">
        <Link href="/" className="text-sm text-ink-dim transition-colors hover:text-ink">
          ← Back to home
        </Link>

        <h1 className="mt-6 font-display text-2xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-ink-dim">Start practicing system design with real feedback.</p>

        <a
          href={googleUrl}
          className="mt-6 flex w-full items-center justify-center rounded-lg border border-line bg-elevated px-4 py-2.5 font-mono text-sm transition-colors hover:bg-line"
        >
          Continue with Google
        </a>

        <div className="my-6 flex items-center gap-3 text-xs text-ink-faint">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>

        <SignUpForm />

        <p className="mt-6 text-center text-sm text-ink-dim">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
