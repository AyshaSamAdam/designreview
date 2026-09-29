import Link from "next/link";
import { ButtonLink } from "@/components/ui/button-link";

function LogoMark() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 text-brand" aria-hidden="true">
      <rect x="1" y="1" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="12" y="12" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 4.5H12M12 4.5V12" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function Navbar() {
  return (
    <header className="border-b border-line">
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5"
        aria-label="Main"
      >
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <LogoMark />
          DesignReview
        </Link>

        <a
          href="#how-it-works"
          className="hidden text-sm text-ink-dim transition-colors hover:text-ink md:block"
        >
          How it works
        </a>

        <div className="flex items-center gap-3">
          <ButtonLink href="/sign-in" variant="secondary">Sign in</ButtonLink>
          <ButtonLink href="/sign-up">Start practicing</ButtonLink>
        </div>
      </nav>
    </header>
  );
}