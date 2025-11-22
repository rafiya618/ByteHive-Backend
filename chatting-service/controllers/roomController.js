import ChatRoom from "../models/ChatRoom.js";
import { generateId } from "../utils/idGenerator.js";

export const joinRoom = async (req, res) => {
  try {
    const { user_id, community_id } = req.body;

    let room = await ChatRoom.findOne({ community_id });
    if (!room) {
      // Create room
      const room_id = generateId();
      room = await ChatRoom.create({
        room_id,
        community_id,
        admin_id: user_id,
        members: [user_id],
      });
      return res.json({ status: "success", message: "Room created", room_id });
    }

    if (!room.members.includes(user_id)) {
      room.members.push(user_id);
      await room.save();
    }

    return res.json({ status: "success", message: "Joined room", room_id: room.room_id });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

// Get room details by room_id
export const getRoomDetails = async (req, res) => {
  try {
    const { room_id } = req.params;

    if (!room_id) {
      return res.status(400).json({ status: 'error', message: 'room_id is required' });
    }

    const room = await ChatRoom.findOne({ room_id });
    if (!room) {
      return res.status(404).json({ status: 'error', message: 'Room not found' });
    }

    return res.json({ status: 'success', room });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
