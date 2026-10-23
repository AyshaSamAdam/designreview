import "dotenv/config";
import { z } from "zod";
import { createServer } from "http";
import { Server } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import app from "./app.js";
import { socketAuth } from "./middleware/socketAuth.js";
import { registerDiagramHandlers } from "./handlers/diagramhandler.js";

const envSchema = z.object({
  PORT: z.coerce.number(),
  JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().min(1),
});

const env = envSchema.parse(process.env);

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    // The website address allowed to open a socket. Set CORS_ORIGIN in production.
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  },
});

const pubClient = createClient({ url: env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));

io.use(socketAuth);

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);
  registerDiagramHandlers(io, socket);
  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
  });
});

httpServer.listen(env.PORT, () => {
  console.log(`room service running on PORT ${env.PORT}`);
});