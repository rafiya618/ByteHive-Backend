
import mongoose from "mongoose";
import dotenv from "dotenv";

// Load env from both local and shared if needed
dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/bytehive";

const notificationSchema = new mongoose.Schema({
    receiverId: String,
    senderId: String,
    triggerType: String,
    message: String,
    createdAt: Date
}, { timestamps: true });

const Notification = mongoose.model("Notification", notificationSchema);

async function checkDB() {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const lastNotifs = await Notification.find().sort({ createdAt: -1 }).limit(5);
    console.log("Last 5 notifications:");
    lastNotifs.forEach(n => {
        console.log(`[${n.createdAt}] To: ${n.receiverId}, Type: ${n.triggerType}, Msg: ${n.message}`);
    });

    await mongoose.disconnect();
}

checkDB().catch(console.error);
