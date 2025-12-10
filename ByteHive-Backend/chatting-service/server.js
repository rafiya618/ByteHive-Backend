import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

import roomRoutes from "./routes/roomRoutes.js";
import threadRoutes from "./routes/threadRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import chatSocket from "./sockets/chatSocket.js";

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

mongoose.connect("mongodb+srv://momina:WFbQgzM54N4G4yqT@cluster0.iuqggh8.mongodb.net/bytehive?retryWrites=true&w=majority&appName=Cluster0")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB error:", err));

// Use chatSocket for chat only
chatSocket(io);

const PORT = 5050;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
