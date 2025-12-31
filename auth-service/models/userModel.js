import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, default: null },
  googleId: { type: String, default: null },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isVerified: { type: Boolean, default: false },
  onboardingStep: { type: Number, default: 1 },
  status: {
    type: String,
    enum: ['active', 'blocked'],
    default: 'active'
  },

  // NEW FIELDS
  name: { type: String, default: "" },
  username: { type: String, default: null, unique: true },
  profileImage: { 
    type: String, 
    default: "https://res.cloudinary.com/ddj65ty0p/image/upload/fl_preserve_transparency/v1745939404/noProfile_ya3jgd.jpg?_s=public-apps" 
  },

  // Moderation Fields
  isSuspended: { type: Boolean, default: false },
  suspendedUntil: { type: Date, default: null },
  suspensionReason: { type: String, default: '' },
  credibilityScore: { type: Number, default: 100 },
  
  warnings: [
    {
      reason: { type: String },
      severity: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
      admin_id: { type: String },
      credibilityDeduction: { type: Number, default: 0 },
      timestamp: { type: Date, default: Date.now }
    }
  ],

  moderationHistory: [
    {
      action: { type: String, enum: ['warned', 'suspended', 'unbanned'] },
      admin_id: { type: String },
      reason: { type: String },
      notes: { type: String },
      timestamp: { type: Date, default: Date.now }
    }
  ]

}, { timestamps: true });


export const userModel = model('User', userSchema);
