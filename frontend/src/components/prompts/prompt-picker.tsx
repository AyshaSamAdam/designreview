"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type PromptSummary = {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  topics: string[];
  summary: string;
};

type Choice = { title: string; promptId?: string };

const difficultyColor = {
  easy: "text-good",
  medium: "text-warn",
  hard: "text-bad",
};

export function PromptPicker() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<PromptSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await apiFetch("/prompts");

        if (response.status === 401) {
          router.push("/sign-in");
          return;
        }

        if (!response.ok) {
          if (!cancelled) setError("Could not load the questions.");
          return;
        }

        const body = await response.json();
        if (!cancelled) setPrompts(body.prompts);
      } catch {
        if (!cancelled) setError("Can't reach the server. Check your connection and try again.");
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function start(choice: Choice, key: string) {
    setStarting(key);
    setStartError(null);

    try {
      const response = await apiFetch("/diagrams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: choice.title,
          nodes: [],
          edges: [],
          promptId: choice.promptId,
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
      setStartError("Could not start the design. Please try again.");
      setStarting(null);
    }
  }

  if (error) {
    return (
      <div className="mt-8">
        <p role="alert" className="rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">
          {error}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg border border-line px-4 py-2 font-mono text-sm hover:bg-elevated"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!prompts) {
    return (
      <div role="status" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <span className="sr-only">Loading questions</span>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl border border-line bg-panel" />
        ))}
      </div>
    );
  }

  return (
    <>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {prompts.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => start({ title: p.title, promptId: p.id }, p.id)}
              disabled={starting !== null}
              className="flex h-full w-full flex-col rounded-xl border border-line bg-panel p-5 text-left transition-colors hover:border-brand disabled:opacity-60"
            >
              <span className={`font-mono text-xs uppercase ${difficultyColor[p.difficulty]}`}>
                {p.difficulty}
              </span>
              <span className="mt-2 font-display text-base font-semibold">{p.title}</span>
              <span className="mt-2 text-sm text-ink-dim">{p.summary}</span>
              <span className="mt-4 flex flex-wrap gap-2">
                {p.topics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-md border border-line px-2 py-0.5 font-mono text-xs text-ink-dim"
                  >
                    {topic}
                  </span>
                ))}
              </span>
              {starting === p.id && <span className="mt-4 text-sm text-ink-dim">Starting...</span>}
            </button>
          </li>
        ))}

        <li>
          <button
            type="button"
            onClick={() => start({ title: "Untitled design" }, "scratch")}
            disabled={starting !== null}
            className="flex h-full min-h-40 w-full flex-col justify-center rounded-xl border border-dashed border-line p-5 text-left transition-colors hover:border-brand disabled:opacity-60"
          >
            <span className="font-display text-base font-semibold">Start from scratch</span>
            <span className="mt-2 text-sm text-ink-dim">A blank canvas with no question.</span>
            {starting === "scratch" && <span className="mt-4 text-sm text-ink-dim">Starting...</span>}
          </button>
        </li>
      </ul>

      {startError && (
        <p role="alert" className="mt-6 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">
          {startError}
        </p>
      )}
    </>
  );
}