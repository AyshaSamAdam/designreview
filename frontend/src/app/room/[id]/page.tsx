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
  const [presentUsers, setPresentUsers] = useState<string[]>([])

  useEffect(() => {

    const newSocket = io("http://localhost:4003", {
      auth: { token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlNjVkYjgwYy0wYTQwLTQwMjctODdkOC0zODE4ZWVlYWFmYWYiLCJpYXQiOjE3OTA2ODk2MDIsImV4cCI6MTc5MDY5MDUwMn0.r5Q7dBUHuZr06VsWFHwtL6gXOVJWiEKlsRsLsy0ZDQk" },
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
      <p>Currently in room : {presentUsers.join(", ") } </p>
      <ReactFlow nodes={nodes} onNodesChange={onNodesChange} />
    </div>
  );
}