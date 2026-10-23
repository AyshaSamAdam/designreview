"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { refreshSession } from "@/lib/session";
import { io, Socket } from "socket.io-client";
import { BoxNode } from "@/components/room/box-node";
import { apiFetch } from "@/lib/api";
import Link from "next/link"
import ReactFlow, {
  Node,
  Edge,
  Connection,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from "reactflow";
import "reactflow/dist/style.css";
import { PresenceAvatars, type Member } from "@/components/room/presence-avatars";
import { ShareButton } from "@/components/room/share-button";
import { RightPanel, type PanelTab } from "@/components/room/right-panel";
import { NotesBar } from "@/components/room/notes-bar";
import { ReviewBar } from "@/components/room/review-bar";




const initialNodes: Node[] = [
  { id: "1", position: { x: 100, y: 100 }, data: { label: "Drag me!" } },
];

type Snapshot = { nodes: Node[]; edges: Edge[] };





const KNOWN_TYPES = ["default", "input", "output", "group"];

function cleanNodes(raw: unknown) {
  if (!Array.isArray(raw)) return [];

  return raw.map((node, index) => {
    const fallback = 80 + index * 40;
    const x = node?.position?.x ?? node?.x;
    const y = node?.position?.y ?? node?.y;

    return {
      ...node,
      id: String(node?.id ?? `node-${index}`),
      type: KNOWN_TYPES.includes(node?.type) ? node.type : "default",
      position: {
        x: typeof x === "number" ? x : fallback,
        y: typeof y === "number" ? y : fallback,
      },
      data: node?.data ?? { label: node?.label ?? node?.type ?? "Untitled" },
    };
  });
}



function cleanEdges(raw: unknown) {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((edge) => edge?.source && edge?.target)
    .map((edge, index) => ({ ...edge, id: String(edge.id ?? `edge-${index}`) }));
}


const nodeTypes = {default : BoxNode}





export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const diagramId = params.id as string;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [past, setPast] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);
  const [selectedId , setSelectedId] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelTab, setPanelTab] = useState<PanelTab>("problem")
  const [reviewStarted, setReviewStarted] = useState(false)
  const [userName , setUserName]  = useState<string | undefined>(undefined)


  useEffect(() => {
       setPanelOpen(window.matchMedia("(min-width: 768px)").matches);

    let retried = false;


    const newSocket = io({
      withCredentials: true,
    });

   
    newSocket.on("connect", () => {
       retried = false;
      newSocket.emit("join-room", diagramId);
    });

    newSocket.on("node-update", (updatedNodes: Node[]) => {
      setNodes(updatedNodes);
    });

    newSocket.on("edge-update", (updatedEdges: Edge[]) => {
      setEdges(updatedEdges);
    });

    newSocket.on("presence-update", (list: Member[]) => {
      setMembers(list);
    });

    newSocket.on("room-state", (saved: { nodes: Node[]; edges: Edge[] }) => {
      const cleaned = cleanNodes(saved.nodes);
      if (cleaned.length > 0) {
        setNodes(cleaned);
      }
      setEdges(cleanEdges(saved.edges));
    });
    newSocket.on("connect_error", async (err) => {
      const expired = err.message === "No token provided" || err.message === "Invalid or expired token"
      if (!expired || retried) return;
      retried = true;
      const renewed = await refreshSession();

      if(renewed) {
        newSocket.connect();
      }
      else {
         router.push("/sign-in")
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [diagramId, router]);



  // Ask the server who is logged in, so the chat can show your initial.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/auth/me");
        if (!res.ok) return;
        const data = await res.json();
        const name = (data.user ?? data)?.name;
        if (!cancelled && typeof name === "string") setUserName(name);
      } catch {
        // If this fails, the chat just shows "Y". Nothing else breaks.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);






  const saveSnapshot = () => {
    const snapshot: Snapshot = { nodes, edges };
    setPast((currentPast) => {
      const last = currentPast[currentPast.length - 1];
      if (last && JSON.stringify(last) === JSON.stringify(snapshot)) {
        return currentPast;
      }
      return [...currentPast, snapshot];
    });
    setFuture([]);
  };



  const undo = () => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast(past.slice(0, -1));
    setFuture([{ nodes, edges }, ...future]);
    setNodes(previous.nodes);
    setEdges(previous.edges);
    socket?.emit("node-update", { diagramId, nodes: previous.nodes });
    socket?.emit("edge-update", { diagramId, edges: previous.edges });
  };

  const redo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture(future.slice(1));
    setPast([...past, { nodes, edges }]);
    setNodes(next.nodes);
    setEdges(next.edges);
    socket?.emit("node-update", { diagramId, nodes: next.nodes });
    socket?.emit("edge-update", { diagramId, edges: next.edges });
  };

  const onNodesChange = (changes: NodeChange[]) => {
    if (changes.some((c) => c.type === "remove")) {
      saveSnapshot();
    }
    setNodes((currentNodes) => {
      const updated = applyNodeChanges(changes, currentNodes);
      socket?.emit("node-update", { diagramId, nodes: updated });
      return updated;
    });
  };

  const onEdgesChange = (changes: EdgeChange[]) => {
    if (changes.some((c) => c.type === "remove")) {
      saveSnapshot();
    }
    setEdges((currentEdges) => {
      const updated = applyEdgeChanges(changes, currentEdges);
      socket?.emit("edge-update", { diagramId, edges: updated });
      return updated;
    });
  };

  const onNodeDragStart = () => {
    saveSnapshot();
  };

  const onConnect = (connection: Connection) => {
    saveSnapshot();
    const updated = addEdge(connection, edges);
    setEdges(updated);
    socket?.emit("edge-update", { diagramId, edges: updated });
  };

  const addNode = (label: string, kind : string) => {
    saveSnapshot();
    const newNode: Node = {
      id: crypto.randomUUID(),
      position: { x: 100 + nodes.length * 30, y: 100 + nodes.length * 30 },
      data: { label , kind},
    };
    const updated = [...nodes, newNode];
    setNodes(updated);
    socket?.emit("node-update", { diagramId, nodes: updated });
  };

  const updateSelectedData = (patch: { label?: string; note?: string }) => {
  if (!selectedId) return;
  const updated = nodes.map((n) =>
    n.id === selectedId ? { ...n, data: { ...n.data, ...patch } } : n
  );
  setNodes(updated);
  socket?.emit("node-update", { diagramId, nodes: updated });
};

  const onNodeClick = (_event : unknown, node : Node) => setSelectedId(node.id)
  const onPaneClick = () => setSelectedId(null);


    const selectedNode = nodes.find((n) =>  n.id === selectedId) ?? null;

    const boxCount = nodes.filter((n) => typeof n.data?.kind === "string").length;

    const startReview = () => {
      setPanelOpen(true)
      setPanelTab("interview")
      setReviewStarted(true)
    }
    const endReview = () => setReviewStarted(false)


    const resumeReview = () => {
      setPanelTab("interview")
      setReviewStarted(true)

    }

  return (
              <div className="flex h-dvh flex-col bg-void text-ink">
    <header className="relative z-20 flex shrink-0 items-center justify-between gap-4 border-b border-line bg-panel px-4 py-2.5 shadow-sm">
      <div className="flex min-w-0 items-center gap-4">
        <Link href="/dashboard" className="shrink-0 font-sans text-sm font-medium text-ink-dim transition-colors hover:text-brand">
          &larr; Dashboard
        </Link>
        <PresenceAvatars members={members} />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={undo}
          disabled={past.length === 0}
          className="rounded-lg border border-line bg-panel px-3 py-1.5 font-sans text-xs font-medium shadow-sm transition-colors hover:border-brand/30 hover:bg-elevated disabled:opacity-40"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={future.length === 0}
          className="rounded-lg border border-line bg-panel px-3 py-1.5 font-sans text-xs font-medium shadow-sm transition-colors hover:border-brand/30 hover:bg-elevated disabled:opacity-40"
        >
          Redo
        </button>
        <ShareButton diagramId={diagramId} />
      </div>
    </header>

    <div className="relative flex min-h-0 flex-1">
      <div className="flex w-36 shrink-0 flex-col gap-2 border-r border-line bg-panel p-3">
        <p className="mb-1 font-sans text-[11px] font-semibold tracking-[0.12em] text-ink-dim uppercase">Add a box</p>
       {[
          { label: "Service", kind: "service" },
          { label: "Database", kind: "database" },
          { label: "Cache", kind: "cache" },
          { label: "Queue", kind: "queue" },
          { label: "Load Balancer", kind: "load_balancer" },
        ].map((item) => (
          <button
            key={item.kind}
            type="button"
            onClick={() => addNode(item.label, item.kind)}
            className="rounded-lg border border-line bg-void px-3 py-2 text-left font-sans text-xs font-medium transition-colors hover:border-brand/30 hover:bg-elevated"
          >
            {item.label}
          </button>
        ))}
      </div>
<div className="flex h-full min-w-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStart={onNodeDragStart}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
          />

          <ReviewBar boxCount={boxCount} edgeCount={edges.length} started={reviewStarted} onStart={startReview}  />

          {selectedNode && (
            <div className="absolute bottom-4 left-1/2 z-10 w-80 -translate-x-1/2 rounded-2xl border border-line bg-panel p-4 shadow-[0_18px_48px_-24px_rgba(32,47,45,0.35)]">
              <p className="font-sans text-[11px] font-semibold tracking-[0.12em] text-ink-dim uppercase">Selected box</p>
              <input
                value={String(selectedNode.data.label ?? "")}
                maxLength={60}
                onFocus={saveSnapshot}
                onChange={(e) => updateSelectedData({ label: e.target.value })}
                className="mt-2 w-full rounded-lg border border-line bg-void px-3 py-2 text-sm focus:bg-panel"
              />
              <p className="mt-3 font-sans text-[11px] font-semibold tracking-[0.12em] text-ink-dim uppercase">Why this box?</p>
              <textarea
                value={String(selectedNode.data.note ?? "")}
                maxLength={300}
                rows={3}
                onFocus={saveSnapshot}
                onChange={(e) => updateSelectedData({ note: e.target.value })}
                placeholder="Write why you added this box"
                className="mt-1 w-full resize-none rounded-lg border border-line bg-void px-3 py-2 text-sm focus:bg-panel"
              />
              <p className="mt-1 text-right font-mono text-xs text-ink-dim">
                {String(selectedNode.data.note ?? "").length} / 300
              </p>
            </div>
          )}
        </div>

        <NotesBar diagramId={diagramId} socket={socket} />
      </div>

      <RightPanel 
      diagramId={diagramId} 
      open={panelOpen} 
      onOpenChange={setPanelOpen}
      tab={panelTab}
      onTabChange={setPanelTab}
      nodes={nodes}
      edges={edges}
      selectedId={selectedId}
      started={reviewStarted}
      boxCount={boxCount}
      onStart={startReview}
      onEnd={endReview}
      onResume={resumeReview}
      userName={userName}
      />
    </div>
  </div>
);
}

