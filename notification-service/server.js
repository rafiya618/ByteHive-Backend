import express from "express";
import cors from "cors";
import http from "http";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import notificationRoutes from "./routes/notificationRoutes.js";
import preferenceRoutes from "./routes/preferenceRoutes.js";
import pushRoutes from "./routes/pushRoutes.js";
import connectDB from "./config/db.js";
// import { setupSocket } from "./socket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

import "./subscriber.js";

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

app.use("/notifications", notificationRoutes)
app.use("/preferences", preferenceRoutes)
app.use("/push", pushRoutes)

app.get("/", (req, res) => {
  res.send("Server running successfully");
});

// ✅ Start Express server
const NOTIFICATION_SERVICE_PORT =
  process.env.NOTIFICATION_SERVICE_PORT || process.env.NOTIFICATION_PORT || 3002;

app.listen(NOTIFICATION_SERVICE_PORT, () => {
  console.log(`Server running on http://localhost:${NOTIFICATION_SERVICE_PORT}`);
});
