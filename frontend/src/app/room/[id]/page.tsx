"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { refreshSession } from "@/lib/session";
import { io, Socket } from "socket.io-client";
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
import { PromptPanel } from "@/components/room/prompt-panel";





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


  useEffect(() => {

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

  const addNode = (label: string) => {
    saveSnapshot();
    const newNode: Node = {
      id: crypto.randomUUID(),
      position: { x: 100 + nodes.length * 30, y: 100 + nodes.length * 30 },
      data: { label },
    };
    const updated = [...nodes, newNode];
    setNodes(updated);
    socket?.emit("node-update", { diagramId, nodes: updated });
  };

  const onNodeDoubleClick = (_event: unknown, node: Node) => {
    const newLabel = window.prompt("Name this box:", node.data.label);
    if (!newLabel) return;

    saveSnapshot();
    const updated = nodes.map((n) =>
      n.id === node.id ? { ...n, data: { ...n.data, label: newLabel } } : n
    );
    setNodes(updated);
    socket?.emit("node-update", { diagramId, nodes: updated });
  };

  return (
              <div className="flex h-dvh flex-col bg-void text-ink">
    <header className="relative z-20 flex shrink-0 items-center justify-between gap-4 border-b border-line bg-panel px-4 py-2">
      <div className="flex min-w-0 items-center gap-4">
        <Link href="/dashboard" className="shrink-0 font-mono text-sm text-ink-dim hover:text-ink">
          &larr; Dashboard
        </Link>
        <PresenceAvatars members={members} />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={undo}
          disabled={past.length === 0}
          className="rounded-lg border border-line px-3 py-1.5 font-mono text-xs hover:bg-elevated disabled:opacity-40"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={future.length === 0}
          className="rounded-lg border border-line px-3 py-1.5 font-mono text-xs hover:bg-elevated disabled:opacity-40"
        >
          Redo
        </button>
        <ShareButton diagramId={diagramId} />
      </div>
    </header>

    <div className="relative flex min-h-0 flex-1">
      <div className="flex w-36 shrink-0 flex-col gap-2 border-r border-line bg-panel p-3">
        <p className="font-mono text-xs uppercase text-ink-dim">Add a box</p>
        {["Service", "Database", "Cache", "Queue", "Load Balancer"].map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => addNode(type)}
            className="rounded-lg border border-line bg-void px-3 py-1.5 text-left font-mono text-xs hover:bg-elevated"
          >
            {type}
          </button>
        ))}
      </div>

      <div className="h-full min-w-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={onNodeDoubleClick}
          onNodeDragStart={onNodeDragStart}
        />
      </div>

      <PromptPanel diagramId={diagramId} />
    </div>
  </div>
);
}


