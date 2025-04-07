const mongoose = require('mongoose')

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("MongoDB connected Successfully!");
    } catch (error) {
        console.log("MongoDB failed to connect", error);
    }
};

module.exports = connectDB ;