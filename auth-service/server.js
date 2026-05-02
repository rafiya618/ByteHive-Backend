import "./config/env.js"; // Load .env BEFORE anything else
import express from "express";
import cors from "cors";
import http from "http";
// import dotenv from "dotenv";
// import dotenv from "dotenv";
// dotenv.config({ path: '../shared-config/.env' });
import passport from "./config/passport.js";
import authRoute from "./routes/authRoutes.js";
import profileRoute from "./routes/profileRoutes.js";
import adminUserRoute from "./routes/adminUserRoutes.js";
import moderationRoute from "./routes/moderationRoutes.js";
import connectDB from "./config/db.js";
// import "./controllers/haha.js"

// dotenv.config();

const app = express();

// CORS configuration - must be before routes
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());


connectDB();
app.use(passport.initialize());

// Routes
app.use("/auth", authRoute);
app.use("/admin", adminUserRoute);
app.use("/profile", profileRoute);
app.use("/api/users", moderationRoute); // Moderation routes (warn, suspend, unsuspend)

app.get("/", (req, res) => {
  res.send("Server running successfully");
});

// Start Express server
const AUTH_SERVICE_PORT =
  process.env.AUTH_SERVICE_PORT || process.env.AUTH_PORT || 3000;

app.listen(AUTH_SERVICE_PORT, () => {
  console.log(`Server running on http://localhost:${AUTH_SERVICE_PORT}`);
});
