let inFlight: Promise<boolean> | null = null;

export function refreshSession(): Promise<boolean> {
  if (!inFlight) {
    inFlight = fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}