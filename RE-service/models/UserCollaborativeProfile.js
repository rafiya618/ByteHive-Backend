import mongoose from "mongoose";

export default mongoose.model(
  "UserCollaborativeProfile",
  new mongoose.Schema({
    userId: String,
    posts: [String],
    communities: [String]
  })
);
