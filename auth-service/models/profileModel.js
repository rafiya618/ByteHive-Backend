import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const profileSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, required: true },
  username: { type: String, unique: true , default: null},
  bio: { type: String, default: "" },
  profileImage: {
    type: String,
    default: "https://res.cloudinary.com/ddj65ty0p/image/upload/fl_preserve_transparency/v1745939404/noProfile_ya3jgd.jpg?_s=public-apps"
  },
  socialLinks: {
    Linkedin: { type: String, default: "" },
    Github: { type: String, default: "" },
    X: { type: String, default: "" },
    Youtube: { type: String, default: "" },
    Instagram: { type: String, default: "" },
    Facebook: { type: String, default: "" },
    Threads: { type: String, default: "" },
    Website: { type: String, default: "" }
  }
}, { timestamps: true });

export default model('Profile', profileSchema);
