import mongoose from "mongoose";

export default mongoose.model(
  "UserContentProfile",
  new mongoose.Schema({
    userId: String,
    tagWeights: Object,
    updatedAt: Date
  })
);
