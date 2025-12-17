import mongoose from "mongoose";

export default mongoose.model(
  "TrendingCommunity",
  new mongoose.Schema({
    communityId: String,
    score: Number
  })
);
