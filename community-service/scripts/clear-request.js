import mongoose from "mongoose";
import dotenv from "dotenv";
import Community from "../models/Community.js";

// Load env from service root
dotenv.config({ path: '../.env' });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/bytehive"; 

async function clearRequest() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        const commId = "694c19ace3507dd81259f3a6";
        const userId = "694e8b2d05e97a42370498fd";

        const community = await Community.findById(commId);
        if (!community) {
            console.log("Community not found");
        } else {
            console.log("Join Requests:", community.joinRequests);
            if (community.joinRequests.includes(userId)) {
                console.log("Removing user from joinRequests...");
                await Community.findByIdAndUpdate(commId, {
                    $pull: { joinRequests: userId }
                });
                console.log("Removed!");
            } else {
                console.log("User not in joinRequests");
            }
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error clearing request:", error);
    }
}

clearRequest().catch(console.error);
