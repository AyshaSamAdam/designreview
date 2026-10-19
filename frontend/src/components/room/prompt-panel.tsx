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

export function PromptBody({ diagramId }: { diagramId: string }) {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [missing, setMissing] = useState(false);
  const [loaded, setLoaded] = useState(false);

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
        if (!cancelled) setPrompt(found);
      } catch {
        // The panel is a helper. If it fails, the room still works, so stay quiet.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [diagramId]);

  if (missing) {
    return <p className="p-4 text-sm text-ink-dim">This question is no longer available.</p>;
  }

  if (!prompt) {
    return (
      <p className="p-4 text-sm text-ink-dim">
        {loaded ? "No problem statement for this design." : "Loading..."}
      </p>
    );
  }

  return (
    <div className="p-4">
      <p className={`font-mono text-xs uppercase ${difficultyColor[prompt.difficulty]}`}>
        {prompt.difficulty}
      </p>
      <h2 className="mt-1 font-display text-base font-semibold">{prompt.title}</h2>
      <p className="mt-3 text-sm text-ink-dim">{prompt.summary}</p>
      <Section title="What it must do" items={prompt.functionalRequirements} />
      <Section title="How well it must do it" items={prompt.nonFunctionalRequirements} />
      <Section title="Scale" items={prompt.scaleHints} />
    </div>
  );
}