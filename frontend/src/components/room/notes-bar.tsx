"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Socket } from "socket.io-client";



export function NotesBar({ diagramId, socket }: { diagramId: string ; socket : Socket | null}) {
  const [open, setOpen] = useState(false);  // is wheteher the bar is expanded or colapsed it starts as false 
  const [text, setText] = useState("");   // text is what is inside the textarea 
  const [loaded, setLoaded] = useState(false);  // is whether the saved notes have arrived from the server yet it start as false 
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");   // is teh small message at the bottom of the note bar status showing error saving saved 
  const dirty = useRef(false); // it measn the user actually types something changing a ref doesnt redraw the screen and we don't need a redraw for this flag. it just needs to remember 

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await apiFetch(`/diagrams/${diagramId}`);
        if (!response.ok) return;
        const diagram = await response.json();
        if (!cancelled) {
          setText(typeof diagram.notes === "string" ? diagram.notes : "");
          setLoaded(true);
        }
      } catch {
        // If loading fails the bar stays disabled, and the room still works.
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [diagramId]);

  useEffect(() => {
    if (!dirty.current) return;
    setStatus("saving");

    const timer = setTimeout(async () => {
      try {
        const response = await apiFetch(`/diagrams/${diagramId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: text }),
        });
        setStatus(response.ok ? "saved" : "error");
      } catch {
        setStatus("error");
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [text, diagramId]);


  useEffect(() => {
     if (!socket) return;
     const onNotes = (incoming : string)  => {
        if ( document.hasFocus() && document.activeElement === textareaRef.current) return;
        setText(incoming)
     };

     socket.on("notes-update", onNotes);
     return () => {
      socket.off("notes-update", onNotes);
     }

  }, [socket])


  const statusText =
    status === "saving" ? "Saving..." : status === "saved" ? "Saved" : status === "error" ? "Couldn't save. Check your connection." : "";

  return (
    <div className="shrink-0 border-t border-line bg-panel">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2 font-mono text-xs uppercase text-ink-dim hover:text-ink"
      >
        <span>Notes{text.trim() ? " (written)" : ""}</span>
        <span>{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="px-4 pb-3">
          <textarea
            ref={textareaRef}
            value={text}
            maxLength={5000}
            rows={5}
            disabled={!loaded}
            placeholder="Assumptions, numbers, trade-offs. Example: 100M new links a month, reads are 10x writes."
            onChange={(e) => {
              dirty.current = true;
              setText(e.target.value);
              socket?.emit("notes-update", {diagramId , notes : e.target.value})
            }}
            className="w-full resize-none rounded-lg border border-line bg-void px-2 py-1.5 text-sm"
          />
          <div className="mt-1 flex justify-between font-mono text-xs text-ink-dim">
            <span>{statusText}</span>
            <span>{text.length} / 5000</span>
          </div>
        </div>
      )}
    </div>
  );
}