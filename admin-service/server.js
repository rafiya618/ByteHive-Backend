import "./config/env.js"; // Load .env BEFORE anything else
import express from "express";
import cors from "cors";
import adminRoutes from "./routes/adminRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import "./subscriber.js"; // start Redis subscriptions
import connectDB from "./config/db.js";

const app = express();

app.use(express.json());
app.use(cors());

connectDB();

// Routes
app.use("/api/admin", adminRoutes); // Admin user management routes
app.use("/api/reports", reportRoutes); // Report and moderation routes
app.use("/api/admin/dashboard", dashboardRoutes); // Dashboard stats/activity

app.get("/", (req, res) => {
  res.send("Admin Service running successfully");
});

// Start Express server
const port = process.env.ADMIN_PORT || 3003;
app.listen(port, () => {
  console.log(`🚀 Admin service listening on :${port}`);
});
