// models/subscriptionModel.js
import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
  userId: String,
  endpoint: String,
  keys: Object,
});

export default mongoose.model("Subscription", subscriptionSchema);
