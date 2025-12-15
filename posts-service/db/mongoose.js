import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

if (!mongoose.connection.readyState) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ MongoDB connected (Worker)"))
    .catch((err) => console.error("❌ Worker Mongo error:", err.message));
}

export default mongoose;
