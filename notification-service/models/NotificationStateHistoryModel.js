import mongoose from "mongoose";

const notificationStateHistorySchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            ref: "User",
            required: true,
            index: true
        },
        action: {
            type: String,
            enum: ["enabled", "disabled"],
            required: true
        },
        notificationType: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    { timestamps: true }
);

// Compound index for efficient user history queries
notificationStateHistorySchema.index({ userId: 1, timestamp: -1 });

export default mongoose.model("NotificationStateHistory", notificationStateHistorySchema);
