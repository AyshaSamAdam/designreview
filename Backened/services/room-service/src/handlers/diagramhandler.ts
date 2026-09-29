import { Server, Socket } from "socket.io";
import axios from "axios";
import debounce from "lodash.debounce"


const saveDiagram = debounce(async ( diagramId : string, nodes : any , token : string) => {
  try{
    await axios.patch(`http://localhost:4002/diagrams/${diagramId}`, {nodes}, {headers : { Authorization : `Bearer ${token}`}})
    console.log(`Saved diagram ${diagramId} to Diagram Service`)
  }
  catch(err: any ) {
    console.log(`Failed to save diagram ${diagramId}`, err.response?.status, err.response?.data, err.message)
  }
}, 2000)

const saveEdges = debounce(async (diagramId: string, edges: any, token: string) => {
  try {
    await axios.patch(
      `http://localhost:4002/diagrams/${diagramId}`,
      { edges },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`Saved edges of diagram ${diagramId}`);
  } catch (err: any) {
    console.log(`Failed to save edges of diagram ${diagramId}:`, err.response?.status, err.response?.data);
  }
}, 2000);




export function registerDiagramHandlers(io: Server, socket: Socket) {


  socket.on("join-room", async (diagramId: string) => {
    try {
      const token = socket.handshake.auth.token;

     const response =  await axios.get(`http://localhost:4002/diagrams/${diagramId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      socket.join(diagramId);
      console.log(`Socket ${socket.id} joined room ${diagramId}`);

      socket.emit("room-state", {
        nodes : response.data.nodes,
        edges : response.data.edges
      });


      const socketsInRoom = await io.in(diagramId).fetchSockets();
      const userIds = socketsInRoom.map((s) => s.data.userId);

      io.to(diagramId).emit("presence-update", userIds);
    } catch (err) {
      socket.emit("join-error", "You do not have permission to view this diagram");
      console.log(`Socket ${socket.id} was denied access to room ${diagramId}`);
    }
  });

  socket.on("disconnecting", () => {
    socket.rooms.forEach(async (room) => {
      if (room === socket.id) return;

      const socketsInRoom = await io.in(room).fetchSockets();
      const remainingUserIds = socketsInRoom
        .filter((s) => s.id !== socket.id)
        .map((s) => s.data.userId);

      io.to(room).emit("presence-update", remainingUserIds);
    });
  });

  socket.on("node-update", (data: { diagramId: string; nodes: any }) => {
    if (!socket.rooms.has(data.diagramId)) {
      console.log(`Socket ${socket.id} tried to update room ${data.diagramId} without joining it`);
      return;
    }
    socket.to(data.diagramId).emit("node-update", data.nodes);
    console.log(`Broadcasting the update to room ${data.diagramId}`);

    const token = socket.handshake.auth.token;
    saveDiagram(data.diagramId, data.nodes, token)
  });


 socket.on("edge-update", (data: { diagramId: string; edges: any }) => {
    if (!socket.rooms.has(data.diagramId)) {
      console.log(`Socket ${socket.id} tried to update edges in room ${data.diagramId} without joining it`);
      return;
    }

    socket.to(data.diagramId).emit("edge-update", data.edges);
    console.log(`Broadcasting edge update to room ${data.diagramId}`);

    const token = socket.handshake.auth.token;
    saveEdges(data.diagramId, data.edges, token);
  });

}