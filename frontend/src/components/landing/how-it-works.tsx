const agents = [
  {
    step: "AGENT 01",
    name: "Structure Agent",
    description:
      "Reads your diagram, every box, line and label, and turns it into a structured model the other agents can reason about.",
  },
  {
    step: "AGENT 02",
    name: "Critique Agent",
    description:
      "Checks your design against real system design principles: bottlenecks, single points of failure, missing caches and queues.",
  },
  {
    step: "AGENT 03",
    name: "Explainer Agent",
    description:
      "Turns the findings into clear feedback: what's wrong, why it matters, and how to fix it.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-line px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-display text-3xl font-semibold">
          Three agents, one honest review
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-ink-dim">
          Not a single AI call. A pipeline that actually reasons about your design.
        </p>

        <ul className="mt-12 grid gap-4 md:grid-cols-3">
          {agents.map((agent) => (
            <li key={agent.step} className="rounded-xl border border-line bg-panel p-5">
              <p className="font-mono text-[10px] tracking-wide text-brand">{agent.step}</p>
              <h3 className="mt-3 font-display text-lg font-semibold">{agent.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-dim">{agent.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}