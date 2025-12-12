import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("MongoDB connected Successfully!");
  } catch (error) {
    console.log("MongoDB failed to connect", error);
  }
};

export default connectDB;
