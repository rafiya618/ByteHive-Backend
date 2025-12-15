import mongoose from "mongoose";

const notificationScheduleSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            ref: "User",
            required: true,
            index: true
        },
        notificationType: {
            type: String,
            enum: ["streak_warning"],
            required: true
        },
        status: {
            type: String,
            enum: ["active", "cancelled", "completed"],
            default: "active",
            index: true
        },
        scheduledFor: {
            type: Date,
            index: true
        },
        lastExecutedAt: {
            type: Date,
            default: null
        },
        metadata: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: () => new Map()
        }
    },
    { timestamps: true }
);

// Compound index for efficient queries
notificationScheduleSchema.index({ userId: 1, status: 1 });
notificationScheduleSchema.index({ scheduledFor: 1, status: 1 });

export default mongoose.model("NotificationSchedule", notificationScheduleSchema);
