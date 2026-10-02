"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export function NewDesignButton() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setCreating(true);
    setError(null);

    try {
      const response = await apiFetch("/diagrams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled design",
          nodes: [],
          edges: [],
          isPublic: false,
        }),
      });

      if (response.status === 401) {
        router.push("/sign-in");
        return;
      }

      if (!response.ok) throw new Error("create failed");

      const data = await response.json();
      const created = data.diagram ?? data;
      router.push(`/room/${created.id}`);
    } catch {
      setError("Could not create a new design. Please try again.");
      setCreating(false);
    }
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={handleClick}
        disabled={creating}
        className="rounded-lg bg-brand px-5 py-2.5 font-mono text-sm font-medium text-void transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {creating ? "Creating..." : "New design"}
      </button>
      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}
    </div>
  );
}