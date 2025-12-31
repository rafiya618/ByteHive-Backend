import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import postRoutes from "./routes/postRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import adminPostRoutes from "./routes/adminPostRoutes.js";
import moderationRoutes from "./routes/moderationRoutes.js";
import "./workers/qaWorker.js";

dotenv.config();

const app = express();

// middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// db
connectDB();

// routes
app.use("/api/posts", postRoutes);
app.use("/api/posts", moderationRoutes); // Moderation routes (report, moderate, delete)
app.use("/api/events", eventRoutes);
app.use("/api/admin/posts", adminPostRoutes); // Admin routes for post management

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Post service listening on :${PORT}`));
