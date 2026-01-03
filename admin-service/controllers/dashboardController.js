import DashboardStats from "../models/DashboardStats.js";

// GET /api/admin/dashboard/stats
export const getDashboardStats = async (_req, res) => {
  try {
    const stats = (await DashboardStats.getCurrent()) || {
      totalUsers: 0,
      totalPosts: 0,
      totalCommunities: 0,
      totalReports: 0,
      updatedAt: null
    };

    return res.json({ ok: true, data: stats });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    return res.status(500).json({ ok: false, message: "Failed to fetch dashboard stats" });
  }
};

// GET /api/admin/dashboard/activity (placeholder)
export const getRecentActivity = async (_req, res) => {
  // Hardcoded for now; replace with real admin activity log source
  const activity = [
    { who: "Sarah (Admin)", what: "Banned user @badactor", when: "5m ago" },
    { who: "James (Mod)", what: "Removed post #98211", when: "12m ago" },
    { who: "Ava (Admin)", what: "Approved report R-1034", when: "29m ago" },
    { who: "Liam (Mod)", what: "Warned user @noisy", when: "1h ago" },
    { who: "System", what: "Auto-flagged 3 posts for spam", when: "2h ago" }
  ];

  return res.json({ ok: true, data: activity });
};
