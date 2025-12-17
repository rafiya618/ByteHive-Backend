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
  dislikePost, getPostVoteStatus,
  incrementView,
  getPostLite,
  getPostCandidates
} from "../controllers/postController.js";

const router = express.Router();

// CRUD
router.post("/", createPost);
router.get("/", getPosts);
// Specific endpoints MUST come before parameterized :id
router.get("/candidates", getPostCandidates);
router.get("/:id/lite", getPostLite);
router.get("/:id", getPostById);
router.put("/:id", updatePost);
router.delete("/:id", deletePost);

// Vote operations
router.post("/:id/like", likePost);
router.post("/:id/dislike", dislikePost);
router.get("/:id/vote-status", getPostVoteStatus);
router.post("/:id/view", incrementView);

// Extras
router.get("/search/query", searchPosts); // /api/posts/search/query?q=term
router.get("/:id/status", getPostStatus);
// (moved) Lite + candidates declared above to avoid :id capturing

export default router;