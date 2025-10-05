// routes/preferences.js
import express from "express";
import Preference from "../models/preferencesModel.js";
import { verifyUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET user preferences
router.get("/:userId", verifyUser, async (req, res) => {
  try {
    console.log('entered to get preferences')
    const prefs = await Preference.findOne({ userId: req.params.userId });
    if (!prefs) {
      const newPrefs = await Preference.create({ userId: req.params.userId });
      return res.json(newPrefs);
    }
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE user preferences
router.put("/:userId", verifyUser, async (req, res) => {
  try {
    const updated = await Preference.findOneAndUpdate(
      { userId: req.params.userId },
      req.body,
      { new: true, upsert: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
