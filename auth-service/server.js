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
import connectDB from "./config/db.js";
// import "./controllers/haha.js"

// dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());


connectDB();
app.use(passport.initialize());

// Routes
app.use("/auth", authRoute);
app.use("/profile", profileRoute);

app.get("/", (req, res) => {
  res.send("Server running successfully");
});

// ✅ Start Express server
const port = process.env.AUTH_PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
