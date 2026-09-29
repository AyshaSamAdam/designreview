"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
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

const initialNodes: Node[] = [
  { id: "1", position: { x: 100, y: 100 }, data: { label: "Drag me!" } },
];

type Snapshot = { nodes: Node[]; edges: Edge[] };

export default function RoomPage() {
  const params = useParams();
  const diagramId = params.id as string;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [presentUsers, setPresentUsers] = useState<string[]>([]);
  const [past, setPast] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);

  useEffect(() => {
    const newSocket = io("http://localhost:4003", {
      auth: { token: "Pate ur acces stoken here " },
    });

    newSocket.on("connect", () => {
      newSocket.emit("join-room", diagramId);
    });

    newSocket.on("node-update", (updatedNodes: Node[]) => {
      setNodes(updatedNodes);
    });

    newSocket.on("edge-update", (updatedEdges: Edge[]) => {
      setEdges(updatedEdges);
    });

    newSocket.on("presence-update", (userIds: string[]) => {
      setPresentUsers(userIds);
    });

    newSocket.on("room-state", (saved: { nodes: Node[]; edges: Edge[] }) => {
      if (saved.nodes.length > 0) {
        setNodes(saved.nodes);
      }
      setEdges(saved.edges ?? []);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [diagramId]);

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
    <div style={{ width: "100vw", height: "100vh" }}>
      <p style={{ position: "absolute", zIndex: 10 }}>
        Currently in room: {presentUsers.join(", ")}
      </p>

      <div style={{ position: "absolute", top: 40, left: 10, zIndex: 10, display: "flex", gap: 8 }}>
        <button onClick={undo} disabled={past.length === 0}>Undo</button>
        <button onClick={redo} disabled={future.length === 0}>Redo</button>
      </div>

      <div style={{ position: "absolute", top: 80, left: 10, zIndex: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        {["Service", "Database", "Cache", "Queue", "Load Balancer"].map((type) => (
          <button key={type} onClick={() => addNode(type)}>{type}</button>
        ))}
      </div>

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
  );
}