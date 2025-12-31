import express from "express";
import {
  incrementReportCount,
  moderatePost,
  deletePostByAdmin,
  suspendUserPosts
} from "../controllers/moderationController.js";

const router = express.Router();

// Increment report count
router.patch("/:id/increment-report", incrementReportCount);

// Moderate post (remove/restore)
router.patch("/:id/moderation", moderatePost);

// Delete post by admin
router.delete("/:id", deletePostByAdmin);

// Suspend all posts by user
router.patch("/user/:userId/suspend", suspendUserPosts);

export default router;
