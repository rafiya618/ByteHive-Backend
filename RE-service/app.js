// Instruction Notes:
// Implements full flow per requirements:
// 1) Event logging endpoint (/track)
// 2) Trending endpoints (/trending) computed from logs only
// 3) Feed endpoint (/feed) returning recommendations, trending, and recent
// 4) Admin routes for batch jobs and profile inspection (/admin)
import express from "express";
import cors from "cors";
import trackRoutes from "./routes/track.routes.js";
import feedRoutes from "./routes/feed.routes.js";
import trendingRoutes from "./routes/trending.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const app = express();

// Enable CORS for all origins
app.use(cors());

app.use(express.json());

app.use("/track", trackRoutes);
app.use("/feed", feedRoutes);
app.use("/trending", trendingRoutes);
app.use("/admin", adminRoutes);

export default app;
