import mongoose from "mongoose";

const chatRoomSchema = new mongoose.Schema({
  room_id: { type: String, required: true, unique: true },
  community_id: { type: String, required: true },
  admin_id: { type: String, required: true },
  no_of_threads: { type: Number, default: 0 },
  threads: [{ type: String }],
  members: [{ type: String }],
  allow_thread_creation: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model("ChatRoom", chatRoomSchema);
