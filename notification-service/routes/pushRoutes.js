// routes/pushRoutes.js
import express from "express";
import subscriptionModel from "../models/subscriptionModel.js";

const router = express.Router();

// Save subscription from client
router.post("/save-subscription", async (req, res) => {
  try {
    const { userId, subscription } = req.body;

    if (!subscription?.endpoint || !subscription?.keys) {
      return res.status(400).json({ success: false, error: "Invalid subscription object" });
    }

    // Upsert subscription for this user + endpoint
    await subscriptionModel.findOneAndUpdate(
      { userId, endpoint: subscription.endpoint },
      {
        userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      { upsert: true, new: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error saving subscription:", err);
    res.status(500).json({ success: false, error: "Failed to save subscription" });
  }
});

export default router;
