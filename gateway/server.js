import http from "http";
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const { setupSocket } = await import("./socket.js");

const app = express();
const server = http.createServer(app);

// Setup socket.io gateway
setupSocket(server);

const PORT = process.env.GATEWAY_SERVICE_PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 WebSocket Gateway running on port ${PORT}`);
});
