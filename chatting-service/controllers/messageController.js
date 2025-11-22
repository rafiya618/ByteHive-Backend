import Message from "../models/Message.js";
import Thread from "../models/Thread.js";
import ChatRoom from "../models/ChatRoom.js";
import { generateId } from "../utils/idGenerator.js";

export const sendMessage = async (req, res) => {
  try {
    const { room_id, thread_id, sender_id, content } = req.body;

    const room = await ChatRoom.findOne({ room_id });
    if (!room) return res.status(404).json({ status: "error", message: "Room not found" });
    if (!room.members.includes(sender_id)) {
      return res.status(403).json({ status: "error", message: "User not in room" });
    }

    const thread = await Thread.findOne({ thread_id, room_id });
    if (!thread) return res.status(404).json({ status: "error", message: "Thread not found" });

    const message_id = generateId();
    const message = await Message.create({
      message_id,
      room_id,
      thread_id,
      sender_id,
      content,
    });

    thread.messages.push(message_id);
    await thread.save();

    req.io.to(thread_id).emit("new_message", { message });

    return res.json({ status: "success", message: "Message sent", message_id });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

export const listMessages = async (req, res) => {
  try {
    const { thread_id } = req.params;
    const messages = await Message.find({ thread_id }).sort({ createdAt: 1 });
    return res.json({ status: "success", messages });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};
