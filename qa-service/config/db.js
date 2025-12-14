import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/bytehive_posts");
    console.log("MongoDB connected Successfully!");
  } catch (error) {
    console.log("MongoDB failed to connect", error);
  }
};

export default connectDB;
