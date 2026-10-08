"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export type DiagramSummary = {
  id: string;
  title: string;
  isPublic: boolean;
  updatedAt: string;
};

type DiagramCardProps = {
  diagram: DiagramSummary;
  badge?: string;
  editable?: boolean;
  onRenamed: (id: string, title: string) => void;
  onDeleted: (id: string) => void;
};

type Mode = "view" | "rename" | "confirm-delete";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const smallButton =
  "rounded-md border border-line px-2.5 py-1 font-mono text-xs transition-colors hover:bg-elevated disabled:opacity-60";

export function DiagramCard({ diagram, badge, editable = false, onRenamed, onDeleted }: DiagramCardProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [draft, setDraft] = useState(diagram.title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "rename") {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [mode]);

  function startRename() {
    setDraft(diagram.title);
    setError(null);
    setMode("rename");
  }

  function cancel() {
    setError(null);
    setMode("view");
  }

  async function saveRename() {
    const title = draft.trim();

    if (title === "") {
      setError("The title cannot be empty.");
      return;
    }

    if (title === diagram.title) {
      cancel();
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch(`/diagrams/${diagram.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      if (response.status === 401) {
        router.push("/sign-in");
        return;
      }

      if (response.status === 403) {
        setError("Only the owner can rename this diagram.");
        return;
      }

      if (response.status === 400) {
        setError("That title is not allowed. Use 1 to 100 characters.");
        return;
      }

      if (!response.ok) throw new Error("rename failed");

      const updated = await response.json();
      onRenamed(diagram.id, updated.title ?? title);
      setMode("view");
    } catch {
      setError("Could not rename. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch(`/diagrams/${diagram.id}`, { method: "DELETE" });

      if (response.status === 401) {
        router.push("/sign-in");
        return;
      }

      if (response.status === 403) {
        setError("Only the owner can delete this diagram.");
        setMode("view");
        return;
      }

      if (response.status !== 204 && response.status !== 404) throw new Error("delete failed");

      onDeleted(diagram.id);
    } catch {
      setError("Could not delete. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="relative rounded-xl border border-line bg-panel p-5 transition-colors hover:border-brand focus-within:border-brand">
      {mode === "rename" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            saveRename();
          }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") cancel();
            }}
            maxLength={100}
            disabled={busy}
            aria-label="Diagram title"
            className="min-w-0 flex-1 rounded-md border border-line bg-void px-2 py-1 text-sm text-ink"
          />
          <button type="submit" disabled={busy} className={smallButton}>
            {busy ? "Saving..." : "Save"}
          </button>
          <button type="button" onClick={cancel} disabled={busy} className={smallButton}>
            Cancel
          </button>
        </form>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 truncate font-display text-base font-semibold">
            <Link href={`/room/${diagram.id}`} className="after:absolute after:inset-0 after:content-['']">
              {diagram.title}
            </Link>
          </h3>
          <div className="flex shrink-0 gap-2">
            {badge && (
              <span className="rounded-md border border-line px-2 py-0.5 font-mono text-xs text-ink-dim">
                {badge}
              </span>
            )}
            {diagram.isPublic && (
              <span className="rounded-md border border-line px-2 py-0.5 font-mono text-xs text-ink-dim">
                PUBLIC
              </span>
            )}
          </div>
        </div>
      )}

      <p className="mt-3 text-sm text-ink-dim">
        Edited {dateFormat.format(new Date(diagram.updatedAt))}
      </p>

      {editable && mode === "view" && (
        <div className="relative z-10 mt-4 flex gap-2">
          <button type="button" onClick={startRename} className={smallButton}>
            Rename
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode("confirm-delete");
            }}
            className={`${smallButton} hover:border-bad/40 hover:text-bad`}
          >
            Delete
          </button>
        </div>
      )}

      {mode === "confirm-delete" && (
        <div className="relative z-10 mt-4">
          <p className="text-sm text-ink">
            Delete <span className="font-medium">{diagram.title}</span>? This cannot be undone.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={confirmDelete}
              disabled={busy}
              className={`${smallButton} border-bad/40 text-bad hover:bg-bad/10`}
            >
              {busy ? "Deleting..." : "Yes, delete"}
            </button>
            <button type="button" onClick={cancel} disabled={busy} className={smallButton}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="relative z-10 mt-3 text-xs text-bad">
          {error}
        </p>
      )}
    </li>
  );
}