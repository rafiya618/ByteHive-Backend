import express from "express";
import {
  logActivity,
  removeActivity,
  getUserActivityHistory,
  getActivityByType,
  getActivitySummary,
  getDailyActivityCount,
  deleteActivity
} from "../controllers/activityController.js";
import { verifyUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// Activity logging
router.post("/log", verifyUser, logActivity);

// Remove activity (for vote removals)
router.post("/remove", verifyUser, removeActivity);


// Activity history
router.get("/history/:user_id", verifyUser, getUserActivityHistory);
router.get("/type/:user_id/:activity_type", verifyUser, getActivityByType);
router.get("/summary/:user_id", verifyUser, getActivitySummary);
router.get("/daily/:user_id", verifyUser, getDailyActivityCount);

// Admin
router.delete("/:activity_id", verifyUser, deleteActivity);

export default router;
