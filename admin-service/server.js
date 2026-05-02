import "./config/env.js"; // Load .env BEFORE anything else
import express from "express";
import cors from "cors";
import adminRoutes from "./routes/adminRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import "./subscriber.js"; // start Redis subscriptions
import connectDB from "./config/db.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import { startAnnouncementScheduler } from "./services/announcementService.js";

const app = express();

app.use(express.json());
app.use(cors());

await connectDB();
startAnnouncementScheduler();

// Routes
app.use("/api/admin", adminRoutes); // Admin user management routes
app.use("/api/reports", reportRoutes); // Report and moderation routes
app.use("/api/admin/dashboard", dashboardRoutes); // Dashboard stats/activity
app.use("/api/admin/announcements", announcementRoutes);

app.get("/", (req, res) => {
  res.send("Admin Service running successfully");
});

// Start Express server
const ADMIN_SERVICE_PORT =
  process.env.ADMIN_SERVICE_PORT || process.env.ADMIN_PORT || 3003;

app.listen(ADMIN_SERVICE_PORT, () => {
  console.log(`🚀 Admin service listening on :${ADMIN_SERVICE_PORT}`);
});
