import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const simplificationSchema = new Schema(
  {
    postId: {
      type: String,
      required: true,
      index: true,
    },
    originalContent: String,
    simplifiedContent: String,
    conciseSummary: String,
    detailedSummary: String,
    keyTakeaways: [String],
    readingLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'intermediate',
    },
    originalReadTime: Number,
    simplifiedReadTime: Number,
    simplificationLevel: {
      type: String,
      enum: ['concise', 'detailed'],
      default: 'detailed',
    },
    createdBy: mongoose.Schema.Types.Mixed, // userId
    aiProvider: String,
    isApproved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

simplificationSchema.index({ postId: 1 });
simplificationSchema.index({ createdBy: 1 });

export const Simplification = model('Simplification', simplificationSchema);
