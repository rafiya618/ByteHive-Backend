import express from "express";
import cors from "cors";
import http from "http";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import commentRoute from "./routes/commentRoutes.js";
import connectDB from "./config/db.js";
import "./subscriber.js"; 
// import { setupSocket } from "./socket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
// const server = http.createServer(app);
// const io = setupSocket(server);

app.use(express.json());
app.use(cors());
// app.use((req, res, next) => {
//   req.io = io;
//   next();
// });

connectDB();

// Routes
app.use("/comment", commentRoute);

app.get("/", (req, res) => {
  res.send("Server running successfully");
});

// ✅ Start Express server
const COMMENT_SERVICE_PORT =
  process.env.COMMENT_SERVICE_PORT || process.env.COMMENT_PORT || 3001;

app.listen(COMMENT_SERVICE_PORT, () => {
  console.log(`Server running on http://localhost:${COMMENT_SERVICE_PORT}`);
});
