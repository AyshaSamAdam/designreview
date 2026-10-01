import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password | DesignReview",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({ searchParams,}: {searchParams: Promise<{ token?: string }>;}) {
  

    const { token } = await searchParams;

  return (
    <AuthCard title="Choose a new password" subtitle="Use at least 8 characters.">
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="space-y-4 text-sm">
          <p role="alert" className="rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-bad">
            This link is missing its reset code.
          </p>
          <Link href="/forgot-password" className="text-brand hover:underline">
            Request a new link
          </Link>
        </div>
      )}
    </AuthCard>
  );
}