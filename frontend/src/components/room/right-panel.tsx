"use client";

import { useEffect, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Edge, Node } from "reactflow";
import { PromptBody } from "@/components/room/prompt-panel";
import { InterviewChat } from "@/components/room/interview-chat";

export type PanelTab = "problem" | "interview";

type Props = {
  diagramId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  nodes: Node[];
  edges: Edge[];
  selectedId: string | null;
  started: boolean;
  boxCount: number;
  onStart: () => void;
  onEnd: () => void;
  onResume : () => void;
  userName?: string;
};

const TABS: { id: PanelTab; label: string }[] = [
  { id: "problem", label: "Problem" },
  { id: "interview", label: "Interview" },
];

const MIN_WIDTH = 320;
const STORAGE_KEY = "designreview.panelWidth";

export function RightPanel({
  diagramId,
  open,
  onOpenChange,
  tab,
  onTabChange,
  nodes,
  edges,
  selectedId,
  started,
  boxCount,
  onStart,
  onEnd,
  onResume,
  userName,
}: Props) {
  // True after the person has paused for a while and could start a review.
  const [nudge, setNudge] = useState(false);
  const [width, setWidth] = useState(MIN_WIDTH);

  useEffect(() => {
    if (started) setNudge(false);
  }, [started]);

  // Use the width the person chose last time.
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(STORAGE_KEY));
      if (saved >= MIN_WIDTH) setWidth(saved);
    } catch {
      // Storage can be blocked. The default width is fine.
    }
  }, []);

  // Dragging the handle on the left edge changes the width.
  function startDrag(e: ReactPointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startWidth = width;
    const maxWidth = Math.max(MIN_WIDTH, Math.floor(window.innerWidth * 0.7));
    let latest = startWidth;

    const onMove = (ev: PointerEvent) => {
      latest = Math.min(maxWidth, Math.max(MIN_WIDTH, startWidth + (startX - ev.clientX)));
      setWidth(latest);
    };
    const onUp = () => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      try {
        localStorage.setItem(STORAGE_KEY, String(latest));
      } catch {
        // Not saving is fine.
      }
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  }

  // Show the green dot only when the person cannot already see the message.
  const showDot = nudge && !started && !(open && tab === "interview");

  return (
    <>
      {!open && (
        <aside className="flex w-10 shrink-0 flex-col items-center border-l border-line bg-panel py-3">
          <button
            type="button"
            onClick={() => {
              onOpenChange(true);
              if (started || nudge) onTabChange("interview");
            }}
            aria-label="Show panel"
            title="Show panel"
            className="relative rounded-md p-2 text-ink-dim hover:bg-elevated hover:text-ink"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {showDot && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-400" />}
          </button>
        </aside>
      )}

      {/* The panel stays on the page even when hidden, so the interview keeps its chat. */}
      <aside
        aria-label="Side panel"
        style={{ "--panel-w": `${width}px` } as React.CSSProperties}
        className={
          open
            ? "absolute inset-y-0 right-0 z-20 flex w-80 max-w-full flex-col border-l border-line bg-panel shadow-lg md:relative md:z-auto md:w-[var(--panel-w)] md:shrink-0 md:shadow-none"
            : "hidden"
        }
      >
        {/* Drag this thin strip to make the panel wider or narrower (desktop only). */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panel"
          onPointerDown={startDrag}
          className="absolute inset-y-0 left-0 z-30 hidden w-1.5 cursor-col-resize touch-none hover:bg-line md:block"
        />

        <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
          <div role="tablist" className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => onTabChange(t.id)}
                className={`relative rounded-md px-3 py-1.5 font-mono text-xs ${
                  tab === t.id ? "bg-elevated text-ink" : "text-ink-dim hover:text-ink"
                }`}
              >
                {t.label}
                {t.id === "interview" && showDot && (
                  <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-emerald-400" />
                )}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="shrink-0 rounded-md border border-line px-2.5 py-1 font-mono text-xs hover:bg-elevated"
          >
            Hide
          </button>
        </div>

        <div className="min-h-0 flex-1">
          <div className={tab === "problem" ? "h-full overflow-y-auto" : "hidden"}>
            <PromptBody diagramId={diagramId} />
          </div>
          <div className={tab === "interview" ? "h-full" : "hidden"}>
            <InterviewChat
              nodes={nodes}
              edges={edges}
              selectedId={selectedId}
              started={started}
              boxCount={boxCount}
              onStart={onStart}
              onEnd={onEnd}
              onIdle={() => setNudge(true)}
              userName={userName}
              diagramId={diagramId}
              onResume={onResume}
            />
          </div>
        </div>
      </aside>
    </>
  );
}