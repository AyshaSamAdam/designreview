"use client";

export const MIN_BOXES = 3;
export const MIN_EDGES = 2;

type Props = {
  boxCount: number;
  edgeCount: number;
  started: boolean;
  onStart: () => void;
};

export function ReviewBar({ boxCount, edgeCount, started, onStart }: Props) {
  const ready = boxCount >= MIN_BOXES && edgeCount >= MIN_EDGES;
  const hint = `Need ${MIN_BOXES} boxes and ${MIN_EDGES} arrows · now ${boxCount} / ${edgeCount}`;

  return (
    <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 flex-col items-center gap-1">
      <button
        type="button"
        onClick={onStart}
        disabled={!ready || started}
        title={started ? "Review in progress" : ready ? "Start the interview review" : hint}
        className="rounded-full border border-brand/20 bg-panel px-5 py-2.5 font-sans text-xs font-semibold text-brand shadow-[0_10px_30px_-12px_rgba(32,47,45,0.32)] transition hover:-translate-y-px hover:border-brand/40 hover:bg-brand/5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {started ? "Review running…" : "✨ Start review"}
      </button>
      {!ready && !started && (
        <p className="rounded-md bg-panel px-2 py-0.5 font-mono text-[11px] text-ink-dim">{hint}</p>
      )}
    </div>
  );
}