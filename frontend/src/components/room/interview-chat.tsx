"use client";

import { useEffect, useRef, useState } from "react";
import type { Edge, Node } from "reactflow";
import { apiFetch } from "@/lib/api";
import { MIN_BOXES, MIN_EDGES } from "@/components/room/review-bar";

type Grade = "missed" | "partial" | "solid";

type GradedResult = {
  grade: Grade;
  feedback: string;
  evidence: string[];
  covered: string[];
  missing: string[];
};

type Message = {
  id: string;
  from: "interviewer" | "you" | "system" | "result";
  text: string;
  about?: string;
  followUp?: boolean;
  result?: GradedResult;
};

// The interview that is going on right now. The server keeps the actual lines.
type Thread = {
  interviewId: string;
  label: string;
  done: boolean;
};

// One pill: a box and its grade (null until it is graded).
type BoxStatus = {  interviewId: string; label: string; grade: Grade | null };

type PastReview = { reviewId: string; at: string; name : string | null; boxes: BoxStatus[] };

// One saved interview, as the server sends it.
type SavedInterview = {
  id: string;
  boxId: string;
  scenarioId: string;
  boxLabel: string;
  grade: Grade | null;
  feedback: string | null;
  covered: unknown;
  missing: unknown;
  evidence: unknown;
  messages: { id: number; position: number; author: "interviewer" | "you"; body: string }[];
};

// A saved interview opened read-only.
type Viewing = { title: string; messages: Message[]; boxId: string; scenarioId: string };

// The server's answer to "do I have a review in progress in this room?"
type ActiveReply = { active: false } | { active: true; reviewId: string; interviews: SavedInterview[] };

type Props = {
  diagramId: string;
  nodes: Node[];
  edges: Edge[];
  selectedId: string | null;
  started: boolean;
  boxCount: number;
  onStart: () => void;
  onEnd: () => void;
  onResume: () => void;
  onIdle?: () => void;
  userName?: string;
};

const PRIORITY = ["database", "queue", "cache", "load_balancer", "service"];

const IDLE_MS = 60_000; // how long without changes before we suggest a review

const GRADE_STYLE: Record<Grade, { label: string; pill: string }> = {
  missed: { label: "Not yet", pill: "border-red-500/30 bg-red-500/10 text-red-400" },
  partial: { label: "Partly there", pill: "border-amber-500/30 bg-amber-500/10 text-amber-400" },
  solid: { label: "Solid", pill: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" },
};

function kindOf(node: Node): string | undefined {
  return typeof node.data?.kind === "string" ? node.data.kind : undefined;
}

function toDiagram(nodes: Node[], edges: Edge[]) {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      data: {
        kind: kindOf(n),
        label: typeof n.data?.label === "string" ? n.data.label : undefined,
        note: typeof n.data?.note === "string" ? n.data.note : undefined,
      },
    })),
    edges: edges.map((e) => ({ source: e.source, target: e.target })),
  };
}

function pickBoxId(nodes: Node[], selectedId: string | null, askedBoxes: string[]): string | null {
  const selected = nodes.find((n) => n.id === selectedId);
  if (selected && kindOf(selected)) return selected.id;

  const rank = (n: Node) => {
    const i = PRIORITY.indexOf(kindOf(n) ?? "");
    return i === -1 ? PRIORITY.length : i;
  };

  const candidates = nodes
    .filter((n) => kindOf(n) && !askedBoxes.includes(n.id))
    .sort((a, b) => rank(a) - rank(b));

  return candidates[0]?.id ?? null;
}

// Turn the server's reply into a safe GradedResult, even if a field is missing.
function toResult(data: Record<string, unknown>): GradedResult {
  const list = (value: unknown) => (Array.isArray(value) ? value.map(String) : []);
  const grade = data.grade === "solid" || data.grade === "partial" ? data.grade : "missed";
  return {
    grade,
    feedback: String(data.feedback ?? ""),
    evidence: list(data.evidence),
    covered: list(data.covered),
    missing: list(data.missing),
  };
}

// Turn a saved interview into chat messages.
function toTranscript(data: SavedInterview): Viewing {
  const label = data.boxLabel.trim() || "this box";
  const messages: Message[] = data.messages.map((m) => ({
    id: String(m.id),
    from: m.author,
    text: m.body,
    about: label,
    followUp: m.author === "interviewer" && m.position > 1,
  }));
  if (data.grade) {
    messages.push({
      id: `result-${data.id}`,
      from: "result",
      text: "",
      about: label,
      result: toResult({
        grade: data.grade,
        feedback: data.feedback,
        evidence: data.evidence,
        covered: data.covered,
        missing: data.missing,
      }),
    });
  }
  return { title: label, messages, boxId: data.boxId, scenarioId: data.scenarioId };
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return `Today · ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday · ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} · ${time}`;
}

function GradePill({ label, grade, onClick }: { label: string; grade: Grade | null; onClick?: () => void }) {
  const style = grade ? GRADE_STYLE[grade] : null;
  const classes = `max-w-full truncate rounded-full border px-2.5 py-0.5 font-mono text-[11px] ${
    style ? style.pill : "border-line bg-void text-ink-dim"
  }`;
  const text = `${label} · ${style ? style.label : "…"}`;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${classes} hover:opacity-80`}>
        {text}
      </button>
    );
  }
  return <span className={classes}>{text}</span>;
}

function PencilIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function PastReviewCard({
  review,
  onOpen,
  onRename,
}: {
  review: PastReview;
  onOpen: (interviewId: string) => void;
  onRename: (reviewId: string, name: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const cancelled = useRef(false);

  const labels = review.boxes.map((b) => b.label.trim() || "box");
  // Until the person renames it, the title is the box names.
  const title = review.name?.trim() || Array.from(new Set(labels)).join(", ");
  const multi = review.boxes.length > 1;
  const count = `${review.boxes.length} ${review.boxes.length === 1 ? "box" : "boxes"}`;

  function startEditing() {
    cancelled.current = false;
    setText(title);
    setEditing(true);
  }

  function finishEditing() {
    setEditing(false);
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    const next = text.trim();
    if (next === title) return;
    onRename(review.reviewId, next === "" ? null : next);
  }

  const header = (
    <>
      <p className="truncate text-sm font-medium">{title}</p>
      <p className="mt-0.5 font-mono text-[11px] text-ink-dim">
        {formatWhen(review.at)} · {count}
      </p>
    </>
  );

  return (
    <div className="rounded-xl border border-line bg-void p-3">
      <div className="flex items-start gap-2">
        {editing ? (
          <input
            autoFocus
            value={text}
            maxLength={60}
            onChange={(e) => setText(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={finishEditing}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                cancelled.current = true;
                e.currentTarget.blur();
              }
            }}
            aria-label="Review name"
            className="min-w-0 flex-1 rounded-md border border-line bg-panel px-2 py-1 text-sm"
          />
        ) : multi ? (
          <div className="min-w-0 flex-1">{header}</div>
        ) : (
          <button
            type="button"
            onClick={() => onOpen(review.boxes[0].interviewId)}
            className="min-w-0 flex-1 rounded-md text-left hover:opacity-80"
          >
            {header}
          </button>
        )}

        {!editing && (
          <button
            type="button"
            onClick={startEditing}
            aria-label="Rename review"
            title="Rename"
            className="shrink-0 rounded-md p-1.5 text-ink-dim hover:bg-elevated hover:text-ink"
          >
            <PencilIcon />
          </button>
        )}
      </div>

      {multi && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {review.boxes.map((b) => (
            <button
              key={b.interviewId}
              type="button"
              onClick={() => onOpen(b.interviewId)}
              className="max-w-full truncate rounded-md border border-line bg-panel px-2 py-0.5 font-mono text-[11px] text-ink-dim hover:text-ink"
            >
              {b.label.trim() || "box"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultSection({
  title,
  items,
  marker,
  markerClass,
}: {
  title: string;
  items: string[];
  marker: string;
  markerClass: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="font-mono text-[11px] uppercase text-ink-dim">{title}</p>
      <ul className="space-y-1 text-sm">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className={`shrink-0 ${markerClass}`}>{marker}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultCard({ result, about }: { result: GradedResult; about?: string }) {
  const style = GRADE_STYLE[result.grade];
  return (
    <div className="max-w-[95%] space-y-3 rounded-xl border border-line bg-elevated p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase text-ink-dim">Feedback{about ? ` · ${about}` : ""}</p>
        <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] ${style.pill}`}>
          {style.label}
        </span>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-relaxed">{result.feedback}</p>

      <ResultSection title="What you covered" items={result.covered} marker="✓" markerClass="text-emerald-400" />
      <ResultSection title="Worth adding" items={result.missing} marker="→" markerClass="text-ink-dim" />

      {result.evidence.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-mono text-[11px] uppercase text-ink-dim">
            Your words that counted ({result.evidence.length})
          </summary>
          <div className="mt-2 space-y-2">
            {result.evidence.map((quote, i) => (
              <blockquote key={i} className="border-l-2 border-line pl-3 italic text-ink-dim">
                {quote}
              </blockquote>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function Avatar({ who, initial }: { who: "ai" | "you"; initial: string }) {
  return (
    <div
      aria-hidden="true"
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
        who === "ai"
          ? "border border-line bg-elevated text-ink"
          : "bg-emerald-500/20 text-emerald-400"
      }`}
    >
      {who === "ai" ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 8V4H8" />
          <rect width="16" height="12" x="4" y="8" rx="2" />
          <path d="M2 14h2" />
          <path d="M20 14h2" />
          <path d="M15 13v2" />
          <path d="M9 13v2" />
        </svg>
      ) : (
        initial
      )}
    </div>
  );
}

function MessageView({ message: m, initial }: { message: Message; initial: string }) {
  if (m.from === "system") {
    return <p className="text-center font-mono text-[11px] text-ink-dim">{m.text}</p>;
  }
  if (m.from === "you") {
    return (
      <div className="flex items-end justify-end gap-2">
        <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm border border-line bg-void px-3 py-2 text-sm">
          {m.text}
        </div>
        <Avatar who="you" initial={initial} />
      </div>
    );
  }
  if (m.from === "result" && m.result) {
    return (
      <div className="flex items-start gap-2">
        <Avatar who="ai" initial="" />
        <div className="min-w-0 flex-1">
          <ResultCard result={m.result} about={m.about} />
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-end gap-2">
      <Avatar who="ai" initial="" />
      <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-elevated px-3 py-2">
        <div className="mb-1 flex items-center gap-2 font-mono text-[11px] uppercase text-ink-dim">
          {m.about && <span>About: {m.about}</span>}
          {m.followUp && <span className="rounded border border-line px-1.5 py-px normal-case">Follow-up</span>}
        </div>
        <p className="whitespace-pre-wrap text-sm">{m.text}</p>
      </div>
    </div>
  );
}

export function InterviewChat({
  diagramId,
  nodes,
  edges,
  selectedId,
  started,
  boxCount,
  onStart,
  onEnd,
  onResume,
  onIdle,
  userName,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState(false);
  const [draft, setDraft] = useState("");
  const [thread, setThread] = useState<Thread | null>(null);
  const [boxes, setBoxes] = useState<BoxStatus[]>([]);
  const [past, setPast] = useState<PastReview[] | "error" | null>(null);
  const [viewing, setViewing] = useState<Viewing | null>(null);
  const [notice, setNotice] = useState("");
  const [idle, setIdle] = useState(false);
  const askedScenarios = useRef<string[]>([]);
  const askedBoxes = useRef<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const asking = useRef(false); // true while a question is on its way
  const session = useRef(0); // goes up every time the review ends, so old replies can be ignored
  const reviewId = useRef(""); // one random id for each Start review ... End review
  const restored = useRef(false); // true when a review was just rebuilt from the server
  const startBox = useRef<string | null>(null); // "Try this box again" sets this

  const ready = boxCount >= MIN_BOXES && edges.length >= MIN_EDGES;
  const hasSelectedKind = nodes.some((n) => n.id === selectedId && kindOf(n));
  const canAnswer = thread !== null && !thread.done && !thinking;
  const pastList = Array.isArray(past) ? past : null;

  const initial = (userName?.trim()[0] ?? "Y").toUpperCase();

  const add = (message: Omit<Message, "id">) => {
    const id = crypto.randomUUID();
    setMessages((current) => [...current, { ...message, id }]);
    return id;
  };

  async function askAbout(boxId: string) {
    if (asking.current) return; // a question is already on its way
    asking.current = true;
    const mySession = session.current;

    const box = nodes.find((n) => n.id === boxId);
    const label = String(box?.data?.label ?? "").trim() || "this box";
    setThinking(true);

    try {
      const res = await apiFetch("/review/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagram: toDiagram(nodes, edges),
          diagramId,
          boxId,
          reviewId: reviewId.current,
          asked: askedScenarios.current.slice(-50),
        }),
      });
      if (mySession !== session.current) return; // the review ended while we waited

      if (res.status === 401) {
        add({ from: "system", text: "Your session expired. Please sign in again." });
        return;
      }
      if (res.status === 429) {
        add({ from: "system", text: "You've reached the hourly limit for interviews. Please come back a little later." });
        return;
      }
      if (!res.ok) {
        add({ from: "system", text: "The interviewer could not be reached. Try again in a moment." });
        return;
      }

      const data = await res.json();
      if (mySession !== session.current) return;

      if (data.done) {
        add({ from: "system", text: `No more questions for ${label}. Try another box.` });
        return;
      }

      askedBoxes.current.push(boxId);
      askedScenarios.current.push(data.scenarioId);
      add({ from: "interviewer", text: String(data.question), about: label });
      // Start a fresh conversation about this box.
      setThread({ interviewId: String(data.interviewId), label, done: false });
      setBoxes((current) => [...current, { interviewId: String(data.interviewId), label, grade: null }]);
    } catch {
      if (mySession === session.current) {
        add({ from: "system", text: "The interviewer could not be reached. Try again in a moment." });
      }
    } finally {
      if (mySession === session.current) {
        asking.current = false;
        setThinking(false);
      }
    }
  }

  function askNext() {
    if (thinking) return;
    const boxId = pickBoxId(nodes, selectedId, askedBoxes.current);
    if (!boxId) {
      add({ from: "system", text: "You've been asked about every box. Select a box to be asked again." });
      return;
    }
    askAbout(boxId);
  }

  async function sendAnswer(gradeNow = false) {
    const text = draft.trim();
    if (!text || !thread || thread.done || thinking) return;

    // Show the answer right away, so the chat feels instant.
    const bubbleId = add({ from: "you", text });
    setDraft("");
    setThinking(true);

    // If sending fails, take the bubble back and return the text to the box.
    const undo = (notice: string) => {
      setMessages((current) => current.filter((m) => m.id !== bubbleId));
      setDraft(text);
      add({ from: "system", text: notice });
    };

    try {
      const res = await apiFetch("/review/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagram: toDiagram(nodes, edges),
          interviewId: thread.interviewId,
          answer: text,
          gradeNow,
        }),
      });

      if (res.status === 401) return undo("Your session expired. Please sign in again.");
      if (res.status === 429) return undo("You've reached the hourly limit. Your answer is back in the box. Try again later.");
      if (res.status === 404) return undo("That interview or box could not be found. Ask about another box.");
      if (res.status === 409) return undo("This box was already graded. Ask about another box.");
      if (!res.ok) return undo("The interviewer could not be reached. Your answer was not sent. Try again.");

      const data = await res.json();

      if (data.kind === "follow_up") {
        add({ from: "interviewer", text: String(data.question), about: thread.label, followUp: true });
      } else if (data.kind === "graded") {
        const result = toResult(data);
        add({ from: "result", text: "", about: thread.label, result });
        setThread({ ...thread, done: true });
        setBoxes((current) =>
          current.map((b) => (b.interviewId === thread.interviewId ? { ...b, grade: result.grade } : b)),
        );
      } else {
        undo("The interviewer sent a reply the app did not understand. Try again.");
      }
    } catch {
      undo("The interviewer could not be reached. Your answer was not sent. Try again.");
    } finally {
      setThinking(false);
    }
  }

  // End review: tell the server, so a refresh does not bring this review back.
  function endReview() {
    const id = reviewId.current;
    if (id) {
      apiFetch("/review/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: id }),
      }).catch(() => {
        // If this fails, the review simply stays open for up to 2 hours.
      });
    }
    onEnd();
  }

  async function openPast(interviewId: string) {
    setNotice("");
    try {
      const res = await apiFetch(`/review/interviews/${interviewId}`);
      if (!res.ok) {
        setNotice("Could not open that interview.");
        return;
      }
      setViewing(toTranscript(await res.json()));
    } catch {
      setNotice("Could not open that interview.");
    }
  }



// Rename a past review. The list updates at once, and goes back if the server says no.
  async function renameReview(id: string, name: string | null) {
    setNotice("");
    const before = past;
    setPast((current) => (Array.isArray(current) ? current.map((r) => (r.reviewId === id ? { ...r, name } : r)) : current));
    try {
      const res = await apiFetch("/review/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: id, name }),
      });
      if (!res.ok) throw new Error("rename failed");
    } catch {
      setPast(before);
      setNotice("Could not rename that review.");
    }
  }




  // Start a new review whose first question is about the same box.
  // The scenario asked last time is skipped when other scenarios exist.
  function tryAgain(v: Viewing) {
    startBox.current = v.boxId;
    askedScenarios.current = [v.scenarioId];
    setViewing(null);
    onStart();
  }

  useEffect(() => {
    if (!started) {
      session.current += 1; // anything still on its way is now out of date
      asking.current = false;
      setThinking(false);
      setMessages([]);
      setDraft("");
      setThread(null);
      setBoxes([]);
      askedScenarios.current = [];
      askedBoxes.current = [];
      return;
    }

    // The review was just rebuilt from the server. Do not ask a new question.
    if (restored.current) {
      restored.current = false;
      return;
    }

    reviewId.current = crypto.randomUUID();
    const target = startBox.current;
    startBox.current = null;
    const first =
      target && nodes.some((n) => n.id === target) ? target : pickBoxId(nodes, selectedId, askedBoxes.current);
    if (first) {
      askAbout(first);
    } else {
      add({ from: "system", text: "Add at least one box from the sidebar first." });
    }
    // Only react to the review starting or ending, not to every canvas change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  // When the page opens, ask the server if a review is already in progress in this room.
  // If yes, rebuild the chat exactly where it stopped.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/review/active?diagramId=${encodeURIComponent(diagramId)}`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as ActiveReply;
        if (cancelled || !data.active || data.interviews.length === 0) return;

        const last = data.interviews[data.interviews.length - 1];
        const labelOf = (i: SavedInterview) => i.boxLabel.trim() || "this box";

        setMessages(data.interviews.flatMap((i) => toTranscript(i).messages));
        setBoxes(data.interviews.map((i) => ({ interviewId: i.id, label: labelOf(i), grade: i.grade })));
        setThread({ interviewId: last.id, label: labelOf(last), done: Boolean(last.grade) });
        askedBoxes.current = data.interviews.map((i) => i.boxId);
        askedScenarios.current = data.interviews.map((i) => i.scenarioId);
        reviewId.current = data.reviewId;

        restored.current = true;
        onResume();
      } catch {
        // If this fails, the person simply sees the start screen.
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagramId]);

  // Load the list of past reviews of this room whenever we are on the start screen
  // (page load, and again right after a review ends).
  useEffect(() => {
    if (started) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/review/interviews?diagramId=${encodeURIComponent(diagramId)}`);
        if (!res.ok) {
          if (!cancelled) setPast("error");
          return;
        }
        const data = await res.json();
        if (!cancelled) setPast(Array.isArray(data.reviews) ? data.reviews : []);
      } catch {
        if (!cancelled) setPast("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [started, diagramId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  // Changes whenever boxes, labels, notes or arrows change (moving a box does not count).
  const designKey =
    nodes.map((n) => `${n.id}:${String(n.data?.label ?? "")}:${String(n.data?.note ?? "")}`).join("|") +
    "#" +
    edges.map((e) => `${e.source}>${e.target}`).join(",");

  // If the design is ready and nothing changes for a while, suggest a review.
  // This only shows a message. It never starts the AI by itself.
  useEffect(() => {
    setIdle(false);
    if (started || !ready) return;
    const timer = setTimeout(() => {
      setIdle(true);
      onIdle?.();
    }, IDLE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designKey, started, ready]);

  // A past interview, opened read-only.
  if (!started && viewing) {
    const boxStillThere = nodes.some((n) => n.id === viewing.boxId);
    const canTryAgain = boxStillThere && ready;
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
          <button
            type="button"
            onClick={() => setViewing(null)}
            className="rounded-md border border-line px-2.5 py-1 font-mono text-xs hover:bg-elevated"
          >
            ← Back
          </button>
          <span className="truncate font-mono text-[11px] uppercase text-ink-dim">{viewing.title}</span>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {viewing.messages.map((m) => (
            <MessageView key={m.id} message={m} initial={initial} />
          ))}
        </div>
        <div className="border-t border-line p-3">
          <button
            type="button"
            onClick={() => tryAgain(viewing)}
            disabled={!canTryAgain}
            className="w-full rounded-lg border border-line bg-void px-3 py-2 font-mono text-xs hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-50"
          >
            Try this box again
          </button>
          {!boxStillThere && (
            <p className="mt-2 text-center font-mono text-[11px] text-ink-dim">This box is no longer in your design.</p>
          )}
        </div>
      </div>
    );
  }

  // The start screen: Start button, then past reviews.
  if (!started) {
    return (
      <div className="flex h-full flex-col overflow-y-auto p-4">
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="font-display text-base font-semibold">No interview yet</p>
          <p className="text-sm text-ink-dim">
            Draw your design, then press Start review. The interviewer will ask about your boxes one at a time.
          </p>
          {idle && ready && (
            <p className="rounded-md border border-line bg-elevated px-3 py-2 text-sm">
              Ready for a review? You have paused for a bit. Press Start review when you want questions.
            </p>
          )}
          <button
            type="button"
            onClick={onStart}
            disabled={!ready}
            className="rounded-full border border-line bg-void px-4 py-2 font-mono text-xs hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-50"
          >
            ✨ Start review
          </button>
          {!ready && (
            <p className="font-mono text-[11px] text-ink-dim">
              Need {MIN_BOXES} boxes and {MIN_EDGES} arrows · now {boxCount} / {edges.length}
            </p>
          )}
        </div>
<div className="mt-2 space-y-3 border-t border-line pt-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase text-ink-dim">Past reviews</p>
            {pastList && pastList.length > 0 && (
              <span className="font-mono text-[11px] text-ink-dim">{pastList.length}</span>
            )}
          </div>
          {notice && <p className="text-xs text-ink-dim">{notice}</p>}
          {past === null && <p className="text-xs text-ink-dim">Loading…</p>}
          {past === "error" && <p className="text-xs text-ink-dim">Could not load your past reviews.</p>}
          {pastList && pastList.length === 0 && (
            <p className="text-xs text-ink-dim">Your finished reviews will appear here.</p>
          )}
          <div className="space-y-2">
            {pastList?.map((review) => (
              <PastReviewCard key={review.reviewId} review={review} onOpen={openPast} onRename={renameReview} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <button
          type="button"
          onClick={askNext}
          disabled={thinking}
          className="rounded-md border border-line px-2.5 py-1 font-mono text-xs hover:bg-elevated disabled:opacity-50"
        >
          {hasSelectedKind ? "Ask about selected box" : "Next box"}
        </button>
        <button
          type="button"
          onClick={endReview}
          className="rounded-md border border-line px-2.5 py-1 font-mono text-xs hover:bg-elevated"
        >
          End review
        </button>
      </div>

      {boxes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-line px-3 py-2">
          {boxes.map((b) => (
            <GradePill key={b.interviewId} label={b.label} grade={b.grade} />
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => (
          <MessageView key={m.id} message={m} initial={initial} />
        ))}
        {thinking && (
          <div className="flex items-end gap-2">
            <Avatar who="ai" initial="" />
            <div className="animate-pulse rounded-2xl rounded-bl-sm bg-elevated px-3 py-2 font-mono text-xs text-ink-dim">
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-line p-3">
        {thread?.done ? (
          <button
            type="button"
            onClick={askNext}
            disabled={thinking}
            className="w-full rounded-lg border border-line bg-void px-3 py-2 font-mono text-xs hover:bg-elevated disabled:opacity-50"
          >
            {hasSelectedKind ? "Ask about selected box" : "Next question"}
          </button>
        ) : (
          <>
            <textarea
              value={draft}
              maxLength={2000}
              rows={3}
              disabled={!canAnswer}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendAnswer();
                }
              }}
              placeholder="Type your answer…"
              className="w-full resize-none rounded-lg border border-line bg-void px-2 py-1.5 text-sm disabled:opacity-60"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="font-mono text-[11px] text-ink-dim">Enter to send · Shift+Enter for a new line</p>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={!canAnswer || !draft.trim()}
                  onClick={() => sendAnswer(true)}
                  className="rounded-md border border-line px-2.5 py-1 font-mono text-xs hover:bg-elevated disabled:opacity-50"
                >
                  Send as final answer
                </button>
                <button
                  type="button"
                  disabled={!canAnswer || !draft.trim()}
                  onClick={() => sendAnswer()}
                  className="rounded-md border border-line bg-void px-2.5 py-1 font-mono text-xs hover:bg-elevated disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}