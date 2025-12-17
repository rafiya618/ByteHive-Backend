import mongoose from "mongoose";

export default mongoose.model(
  "TrendingPost",
  new mongoose.Schema({
    postId: String,
    score: Number
  })
);
