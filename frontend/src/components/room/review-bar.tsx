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
        className="rounded-full border border-line bg-panel px-4 py-2 font-mono text-xs shadow-lg hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-50"
      >
        {started ? "Review running…" : "✨ Start review"}
      </button>
      {!ready && !started && (
        <p className="rounded-md bg-panel px-2 py-0.5 font-mono text-[11px] text-ink-dim">{hint}</p>
      )}
    </div>
  );
}