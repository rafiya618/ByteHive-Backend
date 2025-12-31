import { userModel } from "../models/userModel.js";

// Warn user
export const warnUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, severity = 'low', credibilityDeduction = 0 } = req.body;

    const user = await userModel.findById(id);
    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    // Add warning
    user.warnings.push({
      reason,
      severity,
      admin_id: req.body.adminId || 'system',
      credibilityDeduction,
      timestamp: new Date()
    });

    // Reduce credibility score
    user.credibilityScore = Math.max(0, (user.credibilityScore || 100) - credibilityDeduction);

    // Add to moderation history
    user.moderationHistory.push({
      action: 'warned',
      admin_id: req.body.adminId || 'system',
      reason,
      notes: `Severity: ${severity}, Credibility deduction: ${credibilityDeduction}`,
      timestamp: new Date()
    });

    await user.save();

    return res.json({
      ok: true,
      message: "User warned successfully",
      warnings: user.warnings.length,
      credibilityScore: user.credibilityScore
    });
  } catch (err) {
    console.error("Warn user error:", err);
    return res.status(500).json({
      ok: false,
      message: "Server error",
      error: err.message
    });
  }
};

// Suspend/Ban user
export const suspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { banDuration, reason } = req.body; // banDuration in days, null = permanent

    const user = await userModel.findById(id);
    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    user.isSuspended = true;
    user.suspensionReason = reason || 'Violation of community guidelines';
    user.status = 'blocked';

    if (banDuration) {
      const suspendUntil = new Date();
      suspendUntil.setDate(suspendUntil.getDate() + parseInt(banDuration));
      user.suspendedUntil = suspendUntil;
    } else {
      user.suspendedUntil = null; // Permanent ban
    }

    // Add to moderation history
    user.moderationHistory.push({
      action: 'suspended',
      admin_id: req.body.adminId || 'system',
      reason,
      notes: banDuration ? `Suspended for ${banDuration} days` : 'Permanently banned',
      timestamp: new Date()
    });

    await user.save();

    return res.json({
      ok: true,
      message: banDuration ? `User suspended for ${banDuration} days` : 'User permanently banned',
      suspendedUntil: user.suspendedUntil
    });
  } catch (err) {
    console.error("Suspend user error:", err);
    return res.status(500).json({
      ok: false,
      message: "Server error",
      error: err.message
    });
  }
};

// Unsuspend/Unban user
export const unsuspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await userModel.findById(id);
    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    user.isSuspended = false;
    user.suspendedUntil = null;
    user.suspensionReason = '';
    user.status = 'active';

    // Add to moderation history
    user.moderationHistory.push({
      action: 'unbanned',
      admin_id: req.body.adminId || 'system',
      reason: reason || 'Ban lifted',
      timestamp: new Date()
    });

    await user.save();

    return res.json({
      ok: true,
      message: "User unsuspended successfully"
    });
  } catch (err) {
    console.error("Unsuspend user error:", err);
    return res.status(500).json({
      ok: false,
      message: "Server error",
      error: err.message
    });
  }
};

// Get user by ID (for admin-service to fetch user details)
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await userModel.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    return res.json({
      ok: true,
      user
    });
  } catch (err) {
    console.error("Get user error:", err);
    return res.status(500).json({
      ok: false,
      message: "Server error",
      error: err.message
    });
  }
};
