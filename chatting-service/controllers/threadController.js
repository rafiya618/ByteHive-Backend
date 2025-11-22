import ChatRoom from "../models/ChatRoom.js";
import Thread from "../models/Thread.js";
import { generateId } from "../utils/idGenerator.js";

export const createThread = async (req, res) => {
  try {
    const { room_id, thread_name, user_id } = req.body;
    const room = await ChatRoom.findOne({ room_id });
    if (!room) return res.status(404).json({ status: "error", message: "Room not found" });

    // Check if user is a member of the room
    if (!room.members.includes(user_id) && room.admin_id !== user_id) {
      return res.status(403).json({ status: "error", message: "You are not a member of this room" });
    }

    // Check thread creation permissions
    if (!room.allow_thread_creation && room.admin_id !== user_id) {
      return res.status(403).json({ status: "error", message: "Thread creation is disabled for members" });
    }

    const thread_id = generateId();
    const thread = await Thread.create({ thread_id, room_id, thread_name });

    room.threads.push(thread_id);
    room.no_of_threads += 1;
    await room.save();

    return res.json({ status: "success", message: "Thread created", thread_id, thread_name });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

export const listThreads = async (req, res) => {
  try {
    const { room_id } = req.params;
    const threads = await Thread.find({ room_id });
    return res.json({ status: "success", threads });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

export const deleteThread = async (req, res) => {
  try {
    const { room_id, thread_id, user_id } = req.body;
    const room = await ChatRoom.findOne({ room_id });
    if (!room) return res.status(404).json({ status: "error", message: "Room not found" });

    if (room.admin_id !== user_id) {
      return res.status(403).json({ status: "error", message: "Not allowed to delete threads" });
    }

    await Thread.deleteOne({ thread_id, room_id });
    room.threads = room.threads.filter((t) => t !== thread_id);
    room.no_of_threads = Math.max(0, room.no_of_threads - 1);
    await room.save();

    return res.json({ status: "success", message: "Thread deleted", thread_id });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};
