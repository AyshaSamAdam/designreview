"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import ReactFlow, { Node, applyNodeChanges, NodeChange , Edge, addEdge, Connection} from "reactflow";
import "reactflow/dist/style.css";



const initialNodes: Node[] = [
  { id: "1", position: { x: 100, y: 100 }, data: { label: "Drag me!" } },
];




export default function RoomPage() {
  const params = useParams();
  const diagramId = params.id as string;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [presentUsers, setPresentUsers] = useState<string[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  
  useEffect(() => {

    const newSocket = io("http://localhost:4003", {
      auth: { token: "PATE YOUR REAL AACCCES TOKEN HERE " },
    });

    newSocket.on("connect", () => {
      newSocket.emit("join-room", diagramId);
    });

    newSocket.on("node-update", (updatedNodes: Node[]) => {
      setNodes(updatedNodes);
    });

    setSocket(newSocket);

      newSocket.on("presence-update", (userIds : string[]) => {
        setPresentUsers(userIds)
      })

      newSocket.on("room-state", (saved : {nodes : Node[]; edges : Edge[]}) => {
        if (saved.nodes.length > 0) {
          setNodes(saved.nodes)
        }
        setEdges(saved.edges ?? [])
      })
       
      newSocket.on("edge-update", (updatedEdges : Edge[]) => {
        setEdges(updatedEdges)
      })


    return () => {
      newSocket.disconnect();
    };
  }, [diagramId]);

  const onNodesChange = (changes: NodeChange[]) => {
    setNodes((currentNodes) => {
      const updated = applyNodeChanges(changes, currentNodes);
      socket?.emit("node-update", { diagramId, nodes: updated });
      return updated;
    });
  };

  const addNode = (label: string) => {
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

  const updated = nodes.map((n) =>
    n.id === node.id ? { ...n, data: { ...n.data, label: newLabel } } : n
  );
  setNodes(updated);
  socket?.emit("node-update", { diagramId, nodes: updated });
};



   const onConnect = (connection: Connection) => {
  const updated = addEdge(connection, edges);
  setEdges(updated);
  socket?.emit("edge-update", { diagramId, edges: updated });
};

    return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <p style={{ position: "absolute", zIndex: 10 }}>
        Currently in room: {presentUsers.join(", ")}
      </p>

      <div style={{ position: "absolute", top: 80, left: 10, zIndex: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        {["Service", "Database", "Cache", "Queue", "Load Balancer"].map((type) => (
          <button key={type} onClick={() => addNode(type)}>{type}</button>
        ))}
      </div>

      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onConnect={onConnect}  onNodeDoubleClick={onNodeDoubleClick}  />
    </div>
  );
 
}