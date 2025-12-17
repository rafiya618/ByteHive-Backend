import express from "express";
import { generateFeed } from "../services/ranking.service.js";

// Instruction Notes:
// 4) Feed API aggregates: recommendations, trending, and recent (Requirements 1, 2, 3)
const router = express.Router();

router.get("/:userId", async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const feed = await generateFeed(req.params.userId, { limit });
  res.json(feed);
});

export default router;
