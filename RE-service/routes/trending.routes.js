import express from "express";
import TrendingPost from "../models/TrendingPost.js";
import TrendingCommunity from "../models/TrendingCommunity.js";

const router = express.Router();

router.get("/posts", async (_, res) => {
  // Instruction Notes:
  // 2) Trending Posts endpoint (Requirement: Trending Posts)
  res.json(await TrendingPost.find().sort({ score: -1 }).limit(20));
});

router.get("/communities", async (_, res) => {
  // Instruction Notes:
  // 2) Trending Communities endpoint (Requirement: Trending Communities)
  res.json(await TrendingCommunity.find().sort({ score: -1 }).limit(20));
});

export default router;
