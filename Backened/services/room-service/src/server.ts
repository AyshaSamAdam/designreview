import app from "./app.js"
import "dotenv/config"
import {z } from "zod"
import { createServer } from "http"
import { Server } from "socket.io"


const envSchema = z.object({
    PORT : z.coerce.number(),
    JWT_SECRET : z.string().min(32)

})

const env = envSchema.parse(process.env)

const httpServer = createServer(app);



   const io = new Server(httpServer, {
    cors : {
        origin : "http://localhost:3000",
    }
   })

    io.on("connection", (socket) => {
        console.log("A user connected", socket.id)


            socket.on("disconnected", () => {
            console.log("A user  disconnected", socket.id)
    })

    })


httpServer.listen(env.PORT, () => {
    console.log(`room service running on PORT ${env.PORT}`)
})