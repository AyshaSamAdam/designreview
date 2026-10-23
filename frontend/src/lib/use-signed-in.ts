"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

// Asks the server "is this person signed in?".
// null = still checking, true = signed in, false = not signed in.
export function useSignedIn(): boolean | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const response = await apiFetch("/auth/me");
        if (!cancelled) setSignedIn(response.ok);
      } catch {
        if (!cancelled) setSignedIn(false);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return signedIn;
}