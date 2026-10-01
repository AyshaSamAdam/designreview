import { refreshSession } from "@/lib/session";

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = `${process.env.NEXT_PUBLIC_API_URL}${path}`;
  const options: RequestInit = { ...init, credentials: "include" };

  let response = await fetch(url, options);

  if (response.status === 401 && (await refreshSession())) {
    response = await fetch(url, options);
  }

  return response;
}