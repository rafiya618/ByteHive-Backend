import express from "express";
import { joinRoom, getRoomDetails } from "../controllers/roomController.js";
const router = express.Router();

router.post("/join", joinRoom);

// GET room details - supports both /rooms/details/:room_id and /rooms/:room_id
router.get("/details/:room_id", getRoomDetails);
router.get("/:room_id", getRoomDetails);

export default router;
