import mongoose from "mongoose";
import dotenv from "dotenv";
import Notification from "../models/notificationModel.js";

// Load env from shared-config
dotenv.config({ path: '../../shared-config/.env' });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/bytehive";

async function checkDB() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        const lastNotifs = await Notification.find().sort({ createdAt: -1 }).limit(5);
        console.log("Last 5 notifications:");
        lastNotifs.forEach(n => {
            console.log(`[${n.createdAt}] To: ${n.receiverId}, Type: ${n.triggerType}, Msg: ${n.message}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error checking notifications:", error);
    }
}

checkDB().catch(console.error);
