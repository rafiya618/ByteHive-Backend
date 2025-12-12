import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  message_id: { type: String, required: true, unique: true },
  room_id: { type: String, required: true },
  thread_id: { type: String, required: true },
  sender_id: { type: String, required: true },
  receiver_id: { type: String },
  content: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model("Message", messageSchema);
