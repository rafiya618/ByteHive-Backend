import mongoose from "mongoose";

const userDirectorySchema = new mongoose.Schema(
  {
    email: { type: String, default: "" },
    username: { type: String, default: null },
    name: { type: String, default: "" },
    status: { type: String, default: "active" },
    profileImage: { type: String, default: "" }
  },
  { collection: "users", versionKey: false }
);

export default mongoose.models.UserDirectory || mongoose.model("UserDirectory", userDirectorySchema);