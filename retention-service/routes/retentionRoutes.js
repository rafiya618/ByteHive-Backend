import express from "express";
import {
  recordActivity,
  getUserStreak,
  getAllBadges,
  getUserBadges,
  getUserLevel,
  resetStreak,
  getUserStats,
  getLeaderboard
} from "../controllers/retentionController.js";
import { verifyUser } from "../middleware/authMiddleware.js";

const router = express.Router();



// Streak endpoints
router.post("/activity/record", verifyUser, recordActivity);
router.get("/streak/:user_id", verifyUser, getUserStreak);
router.post("/streak/reset", verifyUser, resetStreak);
router.get("/stats/:user_id", verifyUser, getUserStats);

// Badge endpoints
router.get("/badges/all", verifyUser, getAllBadges);
router.get("/badges/:user_id", verifyUser, getUserBadges);

// Level endpoints
router.get("/level/:user_id", verifyUser, getUserLevel);

// Leaderboard
router.get("/leaderboard", verifyUser, getLeaderboard);

export default router;
