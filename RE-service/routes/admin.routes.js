import express from "express";
import UserContentProfile from "../models/UserContentProfile.js";
import UserCollaborativeProfile from "../models/UserCollaborativeProfile.js";
import { buildProfiles } from "../jobs/buildProfiles.job.js";
import { computeTrending } from "../jobs/computeTrending.job.js";

// Instruction Notes:
// - Admin/testing routes to trigger batch processing and inspect generated summaries/trending.
const router = express.Router();

router.post("/rebuild-profiles", async (req, res) => {
  await buildProfiles();
  res.json({ ok: true, message: "Profiles rebuilt" });
});

router.post("/recompute-trending", async (req, res) => {
  const lookbackHours = req.body?.lookbackHours;
  await computeTrending({ lookbackHours });
  res.json({ ok: true, message: "Trending recomputed" });
});

router.get("/profile/:userId", async (req, res) => {
  const [content, collaborative] = await Promise.all([
    UserContentProfile.findOne({ userId: req.params.userId }).lean(),
    UserCollaborativeProfile.findOne({ userId: req.params.userId }).lean(),
  ]);
  res.json({ content, collaborative });
});

export default router;
