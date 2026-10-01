import Link from "next/link";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm rounded-xl border border-line bg-panel p-8">
        <Link href="/" className="text-sm text-ink-dim transition-colors hover:text-ink">
          ← Back to home
        </Link>
        <h1 className="mt-6 font-display text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-ink-dim">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}