import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import roomRoutes from "./routes/roomRoutes.js";
import threadRoutes from "./routes/threadRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import chatSocket from "./sockets/chatSocket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// Inject io into requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use("/api/rooms", roomRoutes);
app.use("/api/threads", threadRoutes);
app.use("/api/messages", messageRoutes);

const mongoUri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URL ||
  "mongodb://rafiamalik787:DXeBg0sPDCEStAhQ@bytehive-shard-00-00.xqmy3.mongodb.net:27017,bytehive-shard-00-01.xqmy3.mongodb.net:27017,bytehive-shard-00-02.xqmy3.mongodb.net:27017/?ssl=true&replicaSet=atlas-ntyda5-shard-0&authSource=admin&retryWrites=true&w=majority&appName=ByteHive";

mongoose.connect(mongoUri)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB error:", err));

// Use chatSocket for chat only
chatSocket(io);

const PORT = 5050;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
