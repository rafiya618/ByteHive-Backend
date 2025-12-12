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
  isVerified: { type: Boolean, default: false }, // OTP verified?
  onboardingStep: { type: Number, default: 1 }, // 1=register, 2=profile, 3=tags, 4=done

}, { timestamps: true });

export const userModel = model('User', userSchema);
