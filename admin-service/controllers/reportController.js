import Report from "../models/Report.js";
import DashboardStats from "../models/DashboardStats.js";
import axios from "axios";
import { createRedisClients } from "../../shared-config/redisClient.js";

const { pub } = await createRedisClients();

const HOST = process.env.HOST || "http://localhost";
const POSTS_SERVICE_URL = `${HOST}:5000`;
const AUTH_SERVICE_URL = `${HOST}:${process.env.AUTH_PORT || 3000}`;
const COMMENT_SERVICE_URL = `${HOST}:${process.env.COMMENT_PORT || 3001}`;

// SUBMIT REPORT - User reports a post/comment/user/community
export const submitReport = async (req, res) => {
  try {
    const { reporterId, reporterUsername, reporterProfileImage, targetType, targetId, reason, description, evidence } = req.body;

    // Validate input
    if (!reporterId || !targetType || !targetId || !reason) {
      return res.status(400).json({
        ok: false,
        message: "Missing required fields: reporterId, targetType, targetId, reason"
      });
    }

    // Prevent duplicate reports from same user on same target
    const existingReport = await Report.findOne({
      reporterId,
      targetType,
      targetId,
      status: { $in: ["pending", "reviewing"] }
    });

    if (existingReport) {
      return res.status(400).json({
        ok: false,
        message: "You have already reported this item. Pending review."
      });
    }

    // Get target data for denormalization
    let targetTitle = "";
    let targetAuthorId = "";
    let targetAuthorUsername = "";

    if (targetType === "post") {
      try {
        const postRes = await axios.get(`${POSTS_SERVICE_URL}/api/posts/${targetId}`);
        const post = postRes.data?.post || postRes.data;
        targetTitle = post.post_title;
        targetAuthorId = post.user_id;
        targetAuthorUsername = post.author_username;
      } catch (err) {
        console.log("Failed to get post data:", err.message);
        return res.status(404).json({ ok: false, message: "Post not found" });
      }
    }

    // Create report
    const report = await Report.create({
      reporterId,
      reporterUsername: reporterUsername || "Unknown",
      reporterProfileImage: reporterProfileImage || "",
      targetType,
      targetId,
      targetTitle,
      targetAuthorId,
      targetAuthorUsername,
      reason,
      description: description || "",
      evidence: evidence || [],
      status: "pending"
    });

    // Increment report count on target post via posts-service
    if (targetType === "post") {
      try {
        await axios.patch(`${POSTS_SERVICE_URL}/api/posts/${targetId}/increment-report`, {
          reporterId,
          reason
        }).catch(err => console.log("Failed to increment report count:", err.message));
      } catch (err) {
        console.log("Posts service error:", err.message);
      }
    }

    // NOTE: Notification-service does not expose a POST endpoint for this payload.
    // Keep report submission independent and avoid noisy 404 logs.
    await DashboardStats.findOneAndUpdate(
      {},
      { $inc: { totalReports: 1 } },
      { upsert: true }
    );

    return res.status(201).json({
      ok: true,
      message: "Report submitted successfully",
      reportId: report._id
    });
  } catch (err) {
    console.error("Report submission error:", err);
    return res.status(500).json({
      ok: false,
      message: "Server error",
      error: err.message
    });
  }
};

// GET ALL REPORTS - Admin dashboard
export const getReports = async (req, res) => {
  try {
    const { status = "pending", reason, targetType, page = 1, limit = 10 } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (reason) filter.reason = reason;
    if (targetType) filter.targetType = targetType;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get reports with pagination (without populate since User model is in auth-service)
    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Report.countDocuments(filter)
    ]);

    return res.json({
      ok: true,
      data: reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error("Get reports error:", err);
    return res.status(500).json({
      ok: false,
      message: "Server error",
      error: err.message
    });
  }
};

// GET SINGLE REPORT WITH FULL CONTEXT - Admin review
export const getReportDetails = async (req, res) => {
  try {
    const { reportId } = req.params;

    // Get report (without populate since User is in different service)
    const report = await Report.findById(reportId).lean();

    if (!report) {
      return res.status(404).json({ ok: false, message: "Report not found" });
    }

    // Get target data based on type
    let targetData = null;
    let targetContext = {
      comments: [],
      engagement: {},
      authorInfo: {}
    };

    if (report.targetType === "post") {
      try {
        const postRes = await axios.get(`${POSTS_SERVICE_URL}/api/posts/${report.targetId}`);
        targetData = postRes.data?.post || postRes.data;

        // Get author info from auth service
        try {
          const userRes = await axios.get(`${AUTH_SERVICE_URL}/api/users/${targetData.user_id}`);
          targetContext.authorInfo = userRes.data?.user || {};
        } catch (err) {
          console.log("Failed to get author info:", err.message);
        }

        // Build engagement metrics
        targetContext.engagement = {
          upvotes: targetData.upvotes?.length || 0,
          downvotes: targetData.downvotes?.length || 0,
          comments: targetData.comments || 0,
          views: targetData.views || 0,
          totalEngagement: (targetData.upvotes?.length || 0) + (targetData.downvotes?.length || 0) + (targetData.comments || 0) + (targetData.views || 0)
        };
      } catch (err) {
        console.log("Failed to get post:", err.message);
      }
    }

    // Get all reports on same target (report history)
    const reportHistory = await Report.find({
      targetType: report.targetType,
      targetId: report.targetId,
      _id: { $ne: reportId }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get similar reports (same reason)
    const similarReports = await Report.find({
      reason: report.reason,
      status: "pending",
      _id: { $ne: reportId }
    })
      .select("targetTitle targetType createdAt")
      .limit(5);

    return res.json({
      ok: true,
      report,
      targetData,
      targetContext,
      reportHistory,
      similarReports
    });
  } catch (err) {
    console.error("Get report details error:", err);
    return res.status(500).json({
      ok: false,
      message: "Server error",
      error: err.message
    });
  }
};

// ADMIN ACTION ON REPORT - Takes moderation action
export const takeReportAction = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { action, adminId, adminNotes, banDuration } = req.body;

    if (!action) {
      return res.status(400).json({ ok: false, message: "Action is required" });
    }

    // Get report
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ ok: false, message: "Report not found" });
    }

    // Update report status
    const resolvedStatus = action === "approved" ? "dismissed" : "resolved";
    await Report.findByIdAndUpdate(reportId, {
      status: resolvedStatus,
      adminAction: action,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      adminNotes: adminNotes || ""
    });

    // Take action based on admin decision
    let actionResult = { success: true };

    try {
      switch (action) {
        case "approved":
          actionResult = await approvePost(report, adminId);
          break;

        case "removed":
          actionResult = await removePost(report, adminId);
          break;

        case "deleted":
          actionResult = await deletePost(report, adminId);
          break;

        case "user_banned":
          actionResult = await banUser(report, adminId, banDuration);
          break;

        case "user_warned":
          actionResult = await warnUser(report, adminId);
          break;

        default:
          return res.status(400).json({ ok: false, message: "Invalid action" });
      }
    } catch (actionErr) {
      console.error(`Error executing action ${action}:`, actionErr);
      // Don't fail - action execution can have errors (like service down)
      actionResult = { success: true }; // Mark as success anyway
    }

    // Send notifications (non-blocking)
    try {
      await sendModerationNotifications(report, action, adminId);
    } catch (err) {
      console.log("Failed to send notifications:", err.message);
    }

    // Fetch updated report
    const updatedReport = await Report.findById(reportId).lean();

    return res.json({
      ok: true,
      message: `Action '${action}' completed successfully`,
      report: updatedReport
    });
  } catch (err) {
    console.error("Take report action error:", err);
    return res.status(500).json({
      ok: false,
      message: "Server error",
      error: err.message
    });
  }
};

// HELPER: Approve post (dismiss report)
async function approvePost(report, adminId) {
  try {
    // No changes to post - it's already visible and active
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// HELPER: Remove post (hide from community)
async function removePost(report, adminId) {
  try {
    if (report.targetType !== "post") {
      return { success: false, error: "Can only remove posts" };
    }

    // Call posts-service to remove post
    await axios.patch(`${POSTS_SERVICE_URL}/api/posts/${report.targetId}/moderation`, {
      action: "remove",
      adminId,
      reason: report.reason,
      notes: report.adminNotes
    }).catch(err => {
      console.log("Failed to remove post:", err.message);
      throw err;
    });

    // Warn the author
    try {
      await axios.patch(`${AUTH_SERVICE_URL}/api/users/${report.targetAuthorId}/warn`, {
        reason: `Post removed - ${report.reason}`,
        severity: "medium"
      }).catch(err => console.log("Failed to warn user:", err.message));
    } catch (err) {
      console.log("Auth service error:", err.message);
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// HELPER: Delete post permanently
async function deletePost(report, adminId) {
  try {
    if (report.targetType !== "post") {
      return { success: false, error: "Can only delete posts" };
    }

    // Call posts-service to delete post
    await axios.delete(`${POSTS_SERVICE_URL}/api/posts/${report.targetId}`, {
      data: { adminId, reason: report.reason }
    }).catch(err => {
      console.log("Failed to delete post:", err.message);
      throw err;
    });

    // Delete associated comments
    try {
      await axios.delete(`${COMMENT_SERVICE_URL}/api/comments/post/${report.targetId}`).catch(err => {
        console.log("Failed to delete comments:", err.message);
      });
    } catch (err) {
      console.log("Comment service error:", err.message);
    }

    // Reduce author credibility and add warning
    try {
      await axios.patch(`${AUTH_SERVICE_URL}/api/users/${report.targetAuthorId}/warn`, {
        reason: `Post permanently deleted - ${report.reason}`,
        severity: "high",
        credibilityDeduction: 30
      }).catch(err => console.log("Failed to warn user:", err.message));
    } catch (err) {
      console.log("Auth service error:", err.message);
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// HELPER: Ban user
async function banUser(report, adminId, banDuration) {
  try {
    const targetAuthorId = report.targetAuthorId;

    if (!targetAuthorId) {
      return { success: false, error: "Author not found" };
    }

    // Ban the user via auth service
    try {
      await axios.patch(`${AUTH_SERVICE_URL}/api/users/${targetAuthorId}/suspend`, {
        banDuration: banDuration || null,
        reason: `Repeated violations - ${report.reason}`
      }).catch(err => console.log("Failed to ban user:", err.message));
    } catch (err) {
      console.log("Auth service error:", err.message);
    }

    // Hide all posts by this user via posts-service
    if (report.targetType === "post") {
      try {
        await axios.patch(`${POSTS_SERVICE_URL}/api/posts/user/${targetAuthorId}/suspend`, {
          adminId
        }).catch(err => console.log("Failed to suspend user posts:", err.message));
      } catch (err) {
        console.log("Posts service error:", err.message);
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// HELPER: Warn user
async function warnUser(report, adminId) {
  try {
    const targetAuthorId = report.targetAuthorId;

    if (!targetAuthorId) {
      return { success: false, error: "Author not found" };
    }

    try {
      await axios.patch(`${AUTH_SERVICE_URL}/api/users/${targetAuthorId}/warn`, {
        reason: `Content warning - ${report.reason}`,
        severity: "low"
      }).catch(err => console.log("Failed to warn user:", err.message));
    } catch (err) {
      console.log("Auth service error:", err.message);
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// HELPER: Send notifications
async function sendModerationNotifications(report, action, adminId) {
  try {
    const notifications = [];
    const reporterRecipientId = report.reporterId?.toString();
    const targetRecipientId = (report.targetAuthorId || (report.targetType === "user" ? report.targetId : ""))?.toString();
    const targetTypeLabel = {
      post: "post",
      comment: "comment",
      user: "account",
      community: "community"
    }[report.targetType] || "content";
    const reportReason = (report.reason || "policy_violation").replace(/_/g, " ");

    // Notify reporter
    if (action === "approved") {
      notifications.push({
        recipientId: reporterRecipientId,
        message: `Update on your report: No violation was found for the reported ${targetTypeLabel}.`,
        entityType: report.targetType,
        entityId: report.targetId,
        postId: report.targetType === "post" ? report.targetId : undefined,
        data: { reportId: report._id }
      });
    } else if (["removed", "deleted", "user_banned", "user_warned"].includes(action)) {
      const reporterActionMap = {
        removed: `Update on your report: The reported ${targetTypeLabel} was removed for ${reportReason}.`,
        deleted: `Update on your report: The reported ${targetTypeLabel} was permanently deleted for ${reportReason}.`,
        user_banned: `Update on your report: The reported user account was suspended after review for ${reportReason}.`,
        user_warned: `Update on your report: The reported user received an official warning for ${reportReason}.`
      };

      notifications.push({
        recipientId: reporterRecipientId,
        message: reporterActionMap[action],
        entityType: report.targetType,
        entityId: report.targetId,
        postId: report.targetType === "post" ? report.targetId : undefined,
        data: { reportId: report._id }
      });
    }

    // Notify author
    if (["approved", "removed", "deleted", "user_banned", "user_warned"].includes(action)) {
      const messageMap = {
        approved: `Moderation review complete: The report against your ${targetTypeLabel} was closed with no violation found.`,
        removed: `Moderation action: Your ${targetTypeLabel} was removed for ${reportReason}.`,
        deleted: `Moderation action: Your ${targetTypeLabel} was permanently deleted for ${reportReason}.`,
        user_banned: `Moderation action: Your account has been suspended after review for ${reportReason}.`,
        user_warned: `Moderation action: Your account has received an official warning for ${reportReason}.`
      };

      notifications.push({
        recipientId: targetRecipientId,
        message: messageMap[action],
        entityType: report.targetType,
        entityId: report.targetId || report.targetAuthorId,
        postId: report.targetType === "post" ? report.targetId : undefined,
        data: {
          reportId: report._id,
          targetId: report.targetId,
          reason: report.reason
        }
      });
    }

    for (const notification of notifications) {
      if (!notification.recipientId) {
        console.warn(`Skipping moderation notification: missing recipient for action ${action}, report ${report._id}`);
        continue;
      }

      const notificationPayload = {
        receiverId: notification.recipientId?.toString(),
        senderId: (adminId || "admin-system").toString(),
        triggerType: "admin_action",
        triggerId: `report-${report._id}-${action}-${Date.now()}`,
        entityType: notification.entityType,
        entityId: notification.entityId?.toString() || `report-${report._id}`,
        postId: notification.postId?.toString(),
        message: notification.message,
      };

      await pub.publish("notification:event", JSON.stringify({ notificationPayload }));
    }
  } catch (err) {
    console.log("Failed to send notifications:", err.message);
  }
}

// GET REPORT STATS - Dashboard statistics
export const getReportStats = async (req, res) => {
  try {
    const stats = await Promise.all([
      Report.countDocuments({ status: "pending" }),
      Report.countDocuments({ status: "reviewing" }),
      Report.countDocuments({ status: "resolved" }),
      Report.countDocuments({ status: "dismissed" }),
      Report.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: "$reason", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    return res.json({
      ok: true,
      stats: {
        pendingReports: stats[0],
        reviewingReports: stats[1],
        resolvedReports: stats[2],
        dismissedReports: stats[3],
        topReasons: stats[4]
      }
    });
  } catch (err) {
    console.error("Get report stats error:", err);
    return res.status(500).json({
      ok: false,
      message: "Server error",
      error: err.message
    });
  }
};
