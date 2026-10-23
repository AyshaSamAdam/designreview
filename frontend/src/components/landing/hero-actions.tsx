"use client";

import { ButtonLink } from "@/components/ui/button-link";
import { useSignedIn } from "@/lib/use-signed-in";

export function HeroActions() {
  const signedIn = useSignedIn();

  return (
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      {/* Hidden while we check, so the button text does not jump. */}
      <span className={signedIn === null ? "invisible" : ""}>
        {signedIn ? (
          <ButtonLink href="/dashboard">Go to your dashboard →</ButtonLink>
        ) : (
          <ButtonLink href="/sign-up">Try &ldquo;Design a URL Shortener&rdquo; →</ButtonLink>
        )}
      </span>
      <ButtonLink href="#how-it-works" variant="secondary">See how it works</ButtonLink>
    </div>
  );
}