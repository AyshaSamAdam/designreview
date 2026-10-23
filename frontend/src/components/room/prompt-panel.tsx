"use client";

import { useProblem } from "@/lib/use-problem";

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
  const { prompt, missing, loaded } = useProblem(diagramId);

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
    <div className="p-5">
      <p className={`font-mono text-xs uppercase ${difficultyColor[prompt.difficulty]}`}>
        {prompt.difficulty}
      </p>
      <h2 className="mt-2 font-display text-lg font-semibold tracking-tight">{prompt.title}</h2>
      <p className="mt-3 text-sm leading-6 text-ink-dim">{prompt.summary}</p>
      <Section title="What it must do" items={prompt.functionalRequirements} />
      <Section title="How well it must do it" items={prompt.nonFunctionalRequirements} />
      <Section title="Scale" items={prompt.scaleHints} />
    </div>
  );
}