import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables before importing local modules that depend on them
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

// Dynamically import local modules after env is loaded so they see process.env
const { default: connectDB } = await import("./config/db.js");
const postRoutes = (await import("./routes/postRoutes.js")).default;
const eventRoutes = (await import("./routes/eventRoutes.js")).default;
const adminPostRoutes = (await import("./routes/adminPostRoutes.js")).default;
const moderationRoutes = (await import("./routes/moderationRoutes.js")).default;

// (env and local modules already loaded above)

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

// start background workers and subscriber after env is loaded
import("./workers/qaWorker.js").catch((err) => console.error("Failed to load qaWorker:", err));
import("./subscriber.js").catch((err) => console.error("Failed to load subscriber:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Post service listening on :${PORT}`));
