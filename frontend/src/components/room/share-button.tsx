"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

export function ShareButton({ diagramId }: { diagramId: string }) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createLink() {
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const response = await apiFetch(`/diagrams/${diagramId}/invites`, { method: "POST" });

      if (response.status === 404) {
        setError("Only the owner of this diagram can create invite links.");
        return;
      }

      if (!response.ok) throw new Error("invite failed");

      const { token } = await response.json();
      setLink(`${window.location.origin}/invite/${token}`);
    } catch {
      setError("Could not create the link. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError("Could not copy automatically. Select the link and copy it by hand.");
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="rounded-lg bg-brand px-4 py-2 font-mono text-sm font-medium text-void hover:opacity-90"
      >
        Share
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-line bg-panel p-4 shadow-lg">
          <p className="text-sm text-ink">Invite someone to edit this diagram.</p>
          <p className="mt-1 text-xs text-ink-dim">
            Anyone with the link who is signed in can edit. The link works for 7 days.
          </p>

          {!link && (
            <button
              type="button"
              onClick={createLink}
              disabled={loading}
              className="mt-3 w-full rounded-lg border border-line px-3 py-2 font-mono text-sm hover:bg-elevated disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create invite link"}
            </button>
          )}

          {link && (
            <div className="mt-3 flex gap-2">
              <input
                readOnly
                value={link}
                aria-label="Invite link"
                onFocus={(event) => event.currentTarget.select()}
                className="min-w-0 flex-1 rounded-lg border border-line bg-void px-2 py-1.5 font-mono text-xs text-ink"
              />
              <button
                type="button"
                onClick={copyLink}
                className="rounded-lg border border-line px-3 py-1.5 font-mono text-xs hover:bg-elevated"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-3 text-xs text-bad">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}