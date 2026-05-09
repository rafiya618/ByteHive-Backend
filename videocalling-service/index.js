import express from "express";
import http from "http";
import { Server as SocketIO } from "socket.io";
import registerSocketHandlers from "./socket/socketHandlers.js";
import { createMediasoupWorker } from "./mediasoup/mediasoupWorker.js";
import { LISTEN_IP, PORT } from "./config.js";

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server, { 
  cors: { origin: "*", methods: ["GET", "POST"] }
});

let worker;

server.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the existing videocalling-service process or set a different PORT.`
    );
    return;
  }
  console.error("HTTP server error:", error);
});

async function start() {
  worker = await createMediasoupWorker();
  registerSocketHandlers(io, worker);

  server.listen(PORT, LISTEN_IP, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
    console.log(`🌐 Listening IP: ${LISTEN_IP}`);
    console.log("📹 Mediasoup SFU ready for video calls");
  });
}

// Error handling
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  if (error?.code === "EADDRINUSE") {
    return;
  }
  process.exit(1);
});
// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Received SIGINT, shutting down gracefully...");
  if (worker) await worker.close();
  server.close(() => process.exit(0));
});

start();