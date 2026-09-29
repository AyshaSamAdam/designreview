"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import ReactFlow, { Node, applyNodeChanges, NodeChange } from "reactflow";
import "reactflow/dist/style.css";



const initialNodes: Node[] = [
  { id: "1", position: { x: 100, y: 100 }, data: { label: "Drag me!" } },
];




export default function RoomPage() {
  const params = useParams();
  const diagramId = params.id as string;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);

  useEffect(() => {

    const newSocket = io("http://localhost:4003", {
      auth: { token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlNjVkYjgwYy0wYTQwLTQwMjctODdkOC0zODE4ZWVlYWFmYWYiLCJpYXQiOjE3OTA2NDg5ODUsImV4cCI6MTc5MDY0OTg4NX0.K_Qdz6xIaZcdTopWKrNN9gBZASVHatjDROkzRh5UjfU" },
    });

    newSocket.on("connect", () => {
      newSocket.emit("join-room", diagramId);
    });

    newSocket.on("node-update", (updatedNodes: Node[]) => {
      setNodes(updatedNodes);
    });

    setSocket(newSocket);

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

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ReactFlow nodes={nodes} onNodesChange={onNodesChange} />
    </div>
  );
}