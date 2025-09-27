import express from "express";
import {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  searchPosts,
  getPostStatus,
  likePost,
  dislikePost,
  getPostVoteStatus
} from "../controllers/postController.js";

const router = express.Router();

// CRUD
router.post("/", createPost);
router.get("/", getPosts);
router.get("/:id", getPostById);
router.put("/:id", updatePost);
router.delete("/:id", deletePost);

// Vote operations
router.post("/:id/like", likePost);
router.post("/:id/dislike", dislikePost);
router.get("/:id/vote-status", getPostVoteStatus);

// Extras
router.get("/search/query", searchPosts); // /api/posts/search/query?q=term
router.get("/:id/status", getPostStatus);

export default router;