import express from "express";
import { sendMessage, listMessages } from "../controllers/messageController.js";
const router = express.Router();

router.post("/send", sendMessage);
router.get("/:thread_id", listMessages);

export default router;
