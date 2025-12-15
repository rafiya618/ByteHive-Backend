import express from "express";
import { createThread, listThreads, deleteThread } from "../controllers/threadController.js";
const router = express.Router();

router.post("/create", createThread);
router.get("/:room_id", listThreads);
router.delete("/delete", deleteThread);

export default router;
