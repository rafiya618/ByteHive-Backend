
import express from "express";
import {
  deleteNotification,
  getNotifications,
  markNotificationAsRead,
} from "../controllers/notificationController.js";
import { verifyUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// Routes
router.get("/:userId", verifyUser, getNotifications);
router.delete("/delete/:notificationId", verifyUser, deleteNotification);
router.put("/:userId/read", verifyUser, markNotificationAsRead);

export default router;