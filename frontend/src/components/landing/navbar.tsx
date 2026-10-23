import Link from "next/link";
import { NavbarActions } from "@/components/landing/navbar-actions";

function LogoMark() {
  return (
    <svg viewBox="0 0 20 20" className="h-9 w-9 rounded-xl border border-brand/15 bg-brand/10 p-2 text-brand" aria-hidden="true">
      <rect x="1" y="1" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="12" y="12" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 4.5H12M12 4.5V12" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-void/90 backdrop-blur-xl">
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"
        aria-label="Main"
      >
        <Link href="/" className="flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight">
          <LogoMark />
          DesignReview
        </Link>

        <a
          href="#how-it-works"
          className="hidden text-sm text-ink-dim transition-colors hover:text-ink md:block"
        >
          How it works
        </a>

        <NavbarActions />
      </nav>
    </header>
  );
}