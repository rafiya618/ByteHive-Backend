import express from "express";
import http from "http";
import { Server as SocketIO } from "socket.io";
import registerSocketHandlers from "./socket/socketHandlers.js";
import { createMediasoupWorker } from "./mediasoup/mediasoupWorker.js";
import { PORT } from "./config.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server, { 
  cors: { origin: "*", methods: ["GET", "POST"] }
});

let worker;

async function start() {
  worker = await createMediasoupWorker();
  registerSocketHandlers(io, worker);

  server.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
    console.log("📹 Mediasoup SFU ready for video calls");
  });
}

// Error handling
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});
// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Received SIGINT, shutting down gracefully...");
  if (worker) await worker.close();
  server.close(() => process.exit(0));
});

start();