"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Prompt = {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  summary: string;
  functionalRequirements: string[];
  nonFunctionalRequirements: string[];
  scaleHints: string[];
};

const difficultyColor = {
  easy: "text-good",
  medium: "text-warn",
  hard: "text-bad",
};

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="font-mono text-xs uppercase text-ink-dim">{title}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function PromptPanel({ diagramId }: { diagramId: string }) {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [missing, setMissing] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const diagramResponse = await apiFetch(`/diagrams/${diagramId}`);
        if (!diagramResponse.ok) return;

        const diagram = await diagramResponse.json();
        if (!diagram.promptId) return;

        const promptResponse = await apiFetch(`/prompts/${diagram.promptId}`);

        if (promptResponse.status === 404) {
          if (!cancelled) setMissing(true);
          return;
        }

        if (!promptResponse.ok) return;

        const found: Prompt = await promptResponse.json();

        if (!cancelled) {
          setOpen(window.matchMedia("(min-width: 768px)").matches);
          setPrompt(found);
        }
      } catch {
        // The panel is a helper. If it fails, the room still works, so stay quiet.
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [diagramId]);

  if (missing) {
    return (
      <aside className="hidden w-80 shrink-0 border-l border-line bg-panel p-4 text-sm text-ink-dim md:block">
        This question is no longer available.
      </aside>
    );
  }

  if (!prompt) return null;

  if (!open) {
    return (
      <aside className="flex w-10 shrink-0 flex-col items-center border-l border-line bg-panel py-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Show question"
          className="font-mono text-xs text-ink-dim hover:text-ink [writing-mode:vertical-rl]"
        >
          Show question
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Interview question"
      className="absolute inset-y-0 right-0 z-20 flex w-80 max-w-full flex-col border-l border-line bg-panel shadow-lg md:static md:z-auto md:shrink-0 md:shadow-none"
    >
      <div className="flex items-start justify-between gap-3 border-b border-line p-4">
        <div className="min-w-0">
          <p className={`font-mono text-xs uppercase ${difficultyColor[prompt.difficulty]}`}>
            {prompt.difficulty}
          </p>
          <h2 className="mt-1 font-display text-base font-semibold">{prompt.title}</h2>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="shrink-0 rounded-md border border-line px-2.5 py-1 font-mono text-xs hover:bg-elevated"
        >
          Hide
        </button>
      </div>

      <div className="overflow-y-auto p-4">
        <p className="text-sm text-ink-dim">{prompt.summary}</p>
        <Section title="What it must do" items={prompt.functionalRequirements} />
        <Section title="How well it must do it" items={prompt.nonFunctionalRequirements} />
        <Section title="Scale" items={prompt.scaleHints} />
      </div>
    </aside>
  );
}