import { Server, Socket } from "socket.io";
import axios from "axios";

export function registerDiagramHandlers(io: Server, socket: Socket) {
  socket.on("join-room", async (diagramId: string) => {
    try {
      const token = socket.handshake.auth.token;

      const response = await axios.get(
        `http://localhost:4002/diagrams/${diagramId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      socket.join(diagramId);
      console.log(`Socket ${socket.id} joined room ${diagramId}`);
    } catch (err) {
      socket.emit("join-error", "You do not have permission to view this diagram");
      console.log(`Socket ${socket.id} was denied access to room ${diagramId}`);
    }
  });

  socket.on("node-update", (data: { diagramId: string; nodes: any }) => {
    if (!socket.rooms.has(data.diagramId)) {
      console.log(`Socket ${socket.id} tried to update room ${data.diagramId} without joining it `)
       return ;
     }
    socket.to(data.diagramId).emit("node-update", data.nodes);
    console.log(`Broadcasting the update to room ${data.diagramId}`);
  });
}