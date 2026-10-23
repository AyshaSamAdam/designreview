import { HeroActions } from "@/components/landing/hero-actions";

const exampleNodes = [
  { x: 20, y: 20, type: "CLIENT", name: "Web App", flagged: false },
  { x: 220, y: 20, type: "SERVICE", name: "API Gateway", flagged: false },
  { x: 420, y: 20, type: "DATABASE", name: "Postgres", flagged: true },
  { x: 220, y: 120, type: "CACHE", name: "Redis", flagged: false },
];

function HeroDiagram() {
  return (
    <div className="relative mx-auto mt-14 max-w-3xl rounded-3xl border border-line/80 bg-panel/95 p-5 text-left shadow-[0_24px_70px_-38px_rgba(32,47,45,0.3)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_80px_-36px_rgba(32,47,45,0.34)] sm:p-7">
      <div className="mb-4 flex items-center justify-between font-mono text-[10px] text-ink-faint">
        <span>design_a_url_shortener</span>
        <span className="flex items-center gap-1.5 text-warn">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warn" />
          reviewing
        </span>
      </div>

      <svg
        viewBox="0 0 560 190"
        className="w-full"
        role="img"
        aria-label="Example architecture: a web app calls an API gateway, which reads from Redis and a Postgres database."
      >
        <line x1="140" y1="45" x2="220" y2="45" className="stroke-brand" strokeWidth="1.4" />
        <line x1="340" y1="45" x2="420" y2="45" className="stroke-warn" strokeWidth="1.4" strokeDasharray="4 4" />
        <line x1="280" y1="70" x2="280" y2="120" className="stroke-brand" strokeWidth="1.4" />

        {exampleNodes.map((node) => (
          <g key={node.name}>
            <rect
              x={node.x}
              y={node.y}
              width="120"
              height="50"
              rx="8"
              className={`fill-elevated ${node.flagged ? "stroke-warn" : "stroke-line"}`}
              strokeWidth="1.5"
            />
            <text x={node.x + 60} y={node.y + 20} textAnchor="middle" className="fill-ink-faint font-mono text-[9px]">
              {node.type}
            </text>
            <text x={node.x + 60} y={node.y + 38} textAnchor="middle" className="fill-ink font-mono text-[12px]">
              {node.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-20 pb-20 text-center sm:pt-24">
      <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-0" />

      <div className="relative mx-auto max-w-3xl">
        <p className="font-mono text-xs tracking-[0.14em] text-brand uppercase">
          Real-time · AI-reviewed · Free to start
        </p>

        <h1 className="mt-5 font-display text-4xl leading-[1.08] font-semibold tracking-tight sm:text-6xl">
          Sketch the system.
          <br />
          Get told the <span className="text-brand">truth</span> about it.
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-ink-dim sm:text-lg sm:leading-8">
          Draw your architecture and get honest feedback from an AI reviewer grounded in real
          system design principles. Practice solo, or live with a partner, like a real interview.
        </p>

        <HeroActions />
      </div>

      <HeroDiagram />
    </section>
  );
}