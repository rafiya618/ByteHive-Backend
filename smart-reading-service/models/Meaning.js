import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const meaningSchema = new Schema(
  {
    word: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    definition: String,
    pronunciation: String,
    partOfSpeech: String,
    examples: [String],
    synonyms: [String],
    antonyms: [String],
    source: {
      type: String,
      enum: ['dictionary', 'ai_generated', 'user_contributed'],
      default: 'ai_generated',
    },
    searchCount: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for fast lookups
meaningSchema.index({ word: 1 });

export const Meaning = model('Meaning', meaningSchema);
