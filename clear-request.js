
import mongoose from "mongoose";

const MONGO_URI = "mongodb://localhost:27017/bytehive"; // Adjust if needed

const communitySchema = new mongoose.Schema({
    community_name: String,
    joinRequests: [String],
    members: [String]
});

const Community = mongoose.model("Community", communitySchema);

async function clearRequest() {
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
}

clearRequest().catch(console.error);
