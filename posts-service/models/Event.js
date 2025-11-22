// models/Event.js
import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    event_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    small_event_description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 250,
    },
    thumbnail: { type: String },
    category: {
      type: String,
      enum: ["hackathon", "conference", "meetup", "workshop", "webinar", "other"],
      required: true,
    },
    tags: { type: [String], default: [] },
    registration_link: {
      type: String,
      validate: {
        validator: (v) => /^https?:\/\//.test(v),
        message: "Registration link must be valid URL",
      },
    },
    location: { type: String, required: true, default: "Online" },
    event_date: { type: Date, required: true },
    rules: { type: String },
    status: { type: String, enum: ["draft", "ready"], default: "draft" },
    media: {
      inputs: [String],
      assets: [
        {
          url: String,
          public_id: String,
          type: { type: String },
        },
      ],
    },
    googleEventId: { type: String, default: null }, // tracking Google event
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Event", eventSchema);
