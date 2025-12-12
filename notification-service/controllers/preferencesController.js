import Preferences from "../models/preferencesModel.js";

const userFacingTypes = ["comment", "reply", "mention", "like", "follow", "message"];

export const getPreferences = async (req, res) => {
  try {
    const { userId } = req.params;
    let prefs = await Preferences.findOne({ userId });

    if (!prefs) {
      prefs = await Preferences.create({ userId });
    }

    // Strip hidden types before sending to UI
    const cleaned = prefs.toObject();
    ["push", "email", "sms"].forEach((ch) => {
      if (cleaned[ch] && cleaned[ch].types) {
        const filtered = {};
        userFacingTypes.forEach((t) => {
          filtered[t] = cleaned[ch].types[t];
        });
        cleaned[ch].types = filtered;
      }
    });

    res.json(cleaned);
  } catch (err) {
    res.status(500).json({ error: "Failed to load preferences" });
  }
};

export const updatePreferences = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Merge new values into existing doc
    const prefs = await Preferences.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true, upsert: true }
    );

    res.json(prefs);
  } catch (err) {
    res.status(500).json({ error: "Failed to update preferences" });
  }
};
