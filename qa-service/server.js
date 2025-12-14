import "./config/env.js"; // Load .env BEFORE anything else
import express from "express";
import cors from "cors";
import http from "http";
// import dotenv from "dotenv";
import connectDB from "./config/db.js";
import "./workers/qaWorker.js";


const app = express();

app.use(express.json());
app.use(cors());


connectDB();

// Routes


app.get("/", (req, res) => {
  res.send("Server running successfully");
});

// ✅ Start Express server
const port = process.env.QA_PORT || 3003;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
