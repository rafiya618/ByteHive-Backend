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
    summarize: String,           // TYPE 1: Full length, simplified language
    simplifiedContent: String,
    conciseSummary: String,      // TYPE 3: 2-3 sentences
    detailedSummary: String,     // TYPE 4: 5-7 sentences
    keyTakeaways: [String],      // TYPE 2: 3-5 bullet points
    readingLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'intermediate',
    },
    originalReadTime: Number,
    simplifiedReadTime: Number,
    simplificationLevel: {
      type: String,
      enum: ['summarize', 'key_takeaways', 'concise_summary', 'detailed_summary'],
      required: true,
    },
    postVersion: {
      type: Number,
      default: 1,
      comment: 'Increments when blog is edited - triggers cache invalidation'
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

// Compound index for efficient queries (unique per post+level+version)
simplificationSchema.index({ postId: 1, simplificationLevel: 1, postVersion: 1 });
simplificationSchema.index({ createdBy: 1 });

export const Simplification = model('Simplification', simplificationSchema);
