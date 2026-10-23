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
      <div className="w-full max-w-sm rounded-3xl border border-line bg-panel p-8 shadow-[0_24px_70px_-44px_rgba(32,47,45,0.34)] sm:p-9">
        <Link href="/" className="text-sm text-ink-dim transition-colors hover:text-ink">
          ← Back to home
        </Link>
        <h1 className="mt-7 font-display text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-ink-dim">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}