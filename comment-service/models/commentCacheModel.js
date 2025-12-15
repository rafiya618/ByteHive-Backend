import mongoose from "mongoose";

const commentCacheSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // userId from payload
    name: { type: String, required: true },
    username: { type: String, required: true },
    email: { type: String, required: true },
    profileImage: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("commentCache", commentCacheSchema);
