
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://rafiamalik787:DXeBg0sPDCEStAhQ@bytehive.xqmy3.mongodb.net/?retryWrites=true&w=majority&appName=ByteHive";

const communitySchema = new mongoose.Schema({
    joinRequests: [String],
    members: [String]
});

const Community = mongoose.model("Community", communitySchema);

async function clear() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB:", MONGO_URI);

        const commId = "694c19ace3507dd81259f3a6";
        const userId = "694e8b2d05e97a42370498fd";

        const res = await Community.findByIdAndUpdate(commId, {
            $pull: { joinRequests: userId, members: userId }
        }, { new: true });

        console.log("Updated Community:", res?.community_name);
        console.log("Current JoinRequests:", res?.joinRequests);
        console.log("Current Members:", res?.members);

        await mongoose.disconnect();
        console.log("Disconnected.");
    } catch (err) {
        console.error("Error:", err);
    }
}

clear();
