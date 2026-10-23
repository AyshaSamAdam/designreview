"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSignedIn } from "@/lib/use-signed-in";

// If the person is already signed in, send them to the dashboard.
// We only redirect when the server really says "signed in", so old or broken cookies can never cause a loop.
export function RedirectIfSignedIn() {
  const router = useRouter();
  const signedIn = useSignedIn();

  useEffect(() => {
    if (signedIn) router.replace("/dashboard");
  }, [signedIn, router]);

  return null;
}