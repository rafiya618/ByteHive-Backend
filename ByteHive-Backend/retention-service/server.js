import "./config/env.js";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import retentionRoutes from "./routes/retentionRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import initScheduler from "./scheduler.js";

const app = express();

// Initialize Scheduler
initScheduler();

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cors());

// DB Connection
connectDB();

// Routes
app.use("/api/retention", retentionRoutes);
app.use("/api/activity", activityRoutes);

app.get("/", (req, res) => {
  res.send("🚀 Retention Service running successfully");
});

const PORT = process.env.RETENTION_PORT || process.env.PORT || 5005;
app.listen(PORT, () => {
  console.log(`✨ Retention service listening on http://localhost:${PORT}`);
});
