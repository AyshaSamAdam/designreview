"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export type Prompt = {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  summary: string;
  functionalRequirements: string[];
  nonFunctionalRequirements: string[];
  scaleHints: string[];
};

// Loads the problem that this diagram was started from (if any).
// missing = the problem was deleted. loaded = we finished looking.
export function useProblem(diagramId: string) {
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
        // The problem is only a helper. If it fails, the room still works.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [diagramId]);

  return { prompt, missing, loaded };
}

// Only the parts the interviewer needs.
export function problemForReview(prompt: Prompt | null) {
  if (!prompt) return undefined;
  return {
    title: prompt.title,
    summary: prompt.summary,
    functionalRequirements: prompt.functionalRequirements,
    nonFunctionalRequirements: prompt.nonFunctionalRequirements,
    scaleHints: prompt.scaleHints,
  };
}