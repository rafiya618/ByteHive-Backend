import mongoose from "mongoose";

const ActivitySchema = new mongoose.Schema(
  {
    user_id: {
      type: Number,
      required: true,
      index: true
    },
    activity_type: {
      type: String,
      enum: ["read", "post", "comment", "like"],
      required: true,
      index: true
    },
    activity_date: {
      type: Date,
      default: Date.now,
      index: true
    },
    post_id: { type: String },
    comment_id: { type: String },
    activity_description: { type: String }
  },
  { timestamps: true }
);

// Index for efficient querying by user and date
ActivitySchema.index({ user_id: 1, activity_date: -1 });

export default mongoose.model("Activity", ActivitySchema);
