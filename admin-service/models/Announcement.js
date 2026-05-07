import mongoose from "mongoose";

const AnnouncementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    audience: {
      type: String,
      enum: ["all_active", "all_users"],
      default: "all_active"
    },
    scheduledFor: { type: Date, default: null },
    status: {
      type: String,
      enum: ["scheduled", "sending", "sent", "failed"],
      default: "scheduled"
    },
    sentAt: { type: Date, default: null },
    createdBy: { type: String, default: "admin-system" },
    deliverySummary: {
      totalRecipients: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      lastRunAt: { type: Date, default: null },
      error: { type: String, default: "" }
    }
  },
  { timestamps: true }
);

export default mongoose.model("Announcement", AnnouncementSchema);