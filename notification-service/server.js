import "./config/env.js"; // Load .env BEFORE anything else
import express from "express";
import cors from "cors";
import http from "http";
import "./subscriber.js"; 
// import dotenv from "dotenv";
import notificationRoutes from "./routes/notificationRoutes.js";
import preferenceRoutes from "./routes/preferenceRoutes.js";
import pushRoutes from "./routes/pushRoutes.js";
import connectDB from "./config/db.js";
// import { setupSocket } from "./socket.js";
// import dotenv from "dotenv";
// dotenv.config({ path: '../shared-config/.env' });

// dotenv.config();

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
