"use client";

import { ButtonLink } from "@/components/ui/button-link";
import { useSignedIn } from "@/lib/use-signed-in";

export function NavbarActions() {
  const signedIn = useSignedIn();

  if (signedIn) {
    return (
      <div className="flex items-center gap-3">
        <ButtonLink href="/dashboard">Go to dashboard</ButtonLink>
      </div>
    );
  }

  // While we are still checking, keep the space but hide the buttons (no flicker).
  return (
    <div className={`flex items-center gap-3 ${signedIn === null ? "invisible" : ""}`}>
      <ButtonLink href="/sign-in" variant="secondary">Sign in</ButtonLink>
      <ButtonLink href="/sign-up">Start practicing</ButtonLink>
    </div>
  );
}