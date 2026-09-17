import app from "./app.js"
import "dotenv/config"
import {z } from "zod"
import { createServer } from "http"
import { Server } from "socket.io"
import { socketAuth } from "./middleware/socketAuth.js"


const envSchema = z.object({
    PORT : z.coerce.number(),
    JWT_SECRET : z.string().min(32)

})

const env = envSchema.parse(process.env)

const httpServer = createServer(app);



   const io = new Server(httpServer, {
    cors : {
        origin : "http://localhost:3000"
    }
   })

   io.use(socketAuth)

    io.on("connection", (socket) => {
        console.log("A user connected", socket.id)


            socket.on("join-room", (diagramId: string) => {
                socket.join(diagramId)
                console.log(`Socket ${socket.id} joined  room ${diagramId}`)
            })

            socket.on("node-update", (data: { diagramId: string; nodes: any }) => {
                    socket.to(data.diagramId).emit("node-update", data.nodes);
                    console.log(`Broadcasting  the update to room ${data.diagramId}`);
                });


                
         socket.on("disconnected", () => {
         console.log("A user  disconnected", socket.id)
    })

    })


httpServer.listen(env.PORT, () => {
    console.log(`room service running on PORT ${env.PORT}`)
})