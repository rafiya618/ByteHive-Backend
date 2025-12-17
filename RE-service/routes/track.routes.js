import express from "express";
import { logEvent } from "../services/eventIngest.service.js";

// Instruction Notes:
// 1) Public endpoint to collect user events (Requirement: store user's events in logs)
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const log = await logEvent(req.body);
    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
