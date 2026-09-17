"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";

export default function RoomPage() {
  const params = useParams();
  const diagramId = params.id as string;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<any>(null);




  useEffect(() => {

            const newSocket = io("http://localhost:4003", {
            auth: {
                token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlNjVkYjgwYy0wYTQwLTQwMjctODdkOC0zODE4ZWVlYWFmYWYiLCJpYXQiOjE3ODk2MjEwNjYsImV4cCI6MTc4OTYyMTk2Nn0.7EoCtp9-c-j5K3zFEfaEaqB49L-7JpP_WheccuaY1EY",
            },
            });

            newSocket.on("connect", () => {
            setConnected(true);
            newSocket.emit("join-room", diagramId);
            });

            newSocket.on("node-update", (nodes) => {
            setLastUpdate(nodes);
            });

            setSocket(newSocket);

            return () => {
            newSocket.disconnect();
            };

  }, [diagramId]);



  const sendFakeUpdate = () => {
    socket?.emit("node-update", {
      diagramId,
      nodes: [{ x: Math.random() * 500, y: Math.random() * 500 }],
    });
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Room: {diagramId}</h1>
      <p>Connected: {connected ? "Yes" : "No"}</p>
      <button onClick={sendFakeUpdate}>Send fake update</button>
      {lastUpdate && <p>Update happned : {JSON.stringify(lastUpdate)}</p>}
    </div>
  );
}
