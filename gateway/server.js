import http from "http";
import express from "express";
import { setupSocket } from "./socket.js";

const app = express();
const server = http.createServer(app);

// Setup socket.io gateway
setupSocket(server);

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`🚀 WebSocket Gateway running on port ${PORT}`);
});
