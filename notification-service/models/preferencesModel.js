// models/preferencesModel.js
import mongoose from "mongoose";

// 🔹 Base notification channel schema
const channelSchema = new mongoose.Schema({
  inApp:  { type: Boolean, default: true },   // in-app always ON by default
  push:   { type: Boolean, default: true },
  email:  { type: Boolean, default: false }
}, { _id: false });

// 🔹 Per-type schema with grouped categories
const perTypeSchema = new mongoose.Schema({
  // 🟢 User activities (social interactions)
  activities: {
    likePost:    { type: channelSchema, default: () => ({}) },
    likeComment: { type: channelSchema, default: () => ({}) },
    comment:     { type: channelSchema, default: () => ({}) },
    reply:       { type: channelSchema, default: () => ({}) },
    mention:     { type: channelSchema, default: () => ({ push: true }) } // push ON by default
  },

  // 🟡 Network / Social graph events
  network: {
    follow:        { type: channelSchema, default: () => ({}) },
    friendRequest: { type: channelSchema, default: () => ({}) },
    connectionAccepted: { type: channelSchema, default: () => ({}) }
  },

  // 🔵 Content / Updates
  updates: {
    newPost:     { type: channelSchema, default: () => ({}) },
    storyUpdate: { type: channelSchema, default: () => ({}) },
    liveStream:  { type: channelSchema, default: () => ({}) },
    eventInvite: { type: channelSchema, default: () => ({}) }
  },

  // 🔒 System updates (locked — cannot be changed by user)
  system: {
    inApp: { type: Boolean, default: false, immutable: true },
    push:  { type: Boolean, default: false, immutable: true },
    email: { type: Boolean, default: true, immutable: true }
  },

  // 🔒 Security alerts (locked — cannot be changed by user)
  security: {
    inApp: { type: Boolean, default: false, immutable: true },
    push:  { type: Boolean, default: false, immutable: true },
    email: { type: Boolean, default: true, immutable: true }
  }
}, { _id: false });

// 🔹 Main preference schema
const preferenceSchema = new mongoose.Schema({
  userId: { type: String, ref: "User", required: true, unique: true },

  // 🌍 Global settings (apply to all categories)
  global: {
    inApp:  { type: Boolean, default: true, immutable: true }, // cannot disable in-app globally
    push:   { type: Boolean, default: true },
    email:  { type: Boolean, default: false }
  },

  // 📂 Per-type (grouped categories above)
  perType: { type: perTypeSchema, default: () => ({}) }
}, { timestamps: true });

export default mongoose.model("Preference", preferenceSchema);
