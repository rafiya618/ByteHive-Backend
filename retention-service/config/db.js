import mongoose from "mongoose";

const connectDB = async () => {
  if (mongoose.connection.readyState) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected (Retention Service)");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

export default connectDB;
