import mongoose from "mongoose";

const threadSchema = new mongoose.Schema({
  thread_id: { type: String, required: true, unique: true },
  room_id: { type: String, required: true },
  thread_name: { type: String, required: true },
  messages: [{ type: String }],
}, { timestamps: true });

export default mongoose.model("Thread", threadSchema);
