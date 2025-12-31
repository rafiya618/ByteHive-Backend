import Post from "../models/Post.js";

// Increment report count when a report is submitted
export const incrementReportCount = async (req, res) => {
  try {
    const { id } = req.params;
    const { reporterId, reason } = req.body;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ ok: false, message: "Post not found" });
    }

    // Add to reported_by_users if not already reported by this user
    const alreadyReported = post.reported_by_users.some(
      (report) => report.user_id === reporterId
    );

    if (!alreadyReported) {
      post.reported_by_users.push({
        user_id: reporterId,
        reason,
        reported_at: new Date()
      });
      post.report_count = (post.report_count || 0) + 1;
      post.is_reported = true;
      await post.save();
    }

    return res.json({
      ok: true,
      message: "Report count incremented",
      report_count: post.report_count
    });
  } catch (err) {
    console.error("Increment report count error:", err);
    return res.status(500).json({
      ok: false,
      message: "Server error",
      error: err.message
    });
  }
};

// Moderate post (remove/restore)
export const moderatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, adminId, reason, notes } = req.body;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ ok: false, message: "Post not found" });
    }

    if (action === "remove") {
      post.moderation_status = "removed";
      post.is_visible = false;
    } else if (action === "restore") {
      post.moderation_status = "active";
      post.is_visible = true;
    }

    // Add to moderation history
    post.moderation_history.push({
      action: action === "remove" ? "removed" : "approved",
      admin_id: adminId,
      reason: reason || "",
      notes: notes || "",
      timestamp: new Date()
    });

    await post.save();

    return res.json({
      ok: true,
      message: `Post ${action}d successfully`,
      post
    });
  } catch (err) {
    console.error("Moderate post error:", err);
    return res.status(500).json({
      ok: false,
      message: "Server error",
      error: err.message
    });
  }
};

// Delete post (by admin)
export const deletePostByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId, reason } = req.body;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ ok: false, message: "Post not found" });
    }

    // Add to moderation history before deletion
    post.moderation_history.push({
      action: "deleted",
      admin_id: adminId,
      reason: reason || "",
      timestamp: new Date()
    });

    post.moderation_status = "deleted";
    post.is_visible = false;
    await post.save();

    // Optionally: actually delete the post
    // await Post.findByIdAndDelete(id);

    return res.json({
      ok: true,
      message: "Post deleted successfully"
    });
  } catch (err) {
    console.error("Delete post error:", err);
    return res.status(500).json({
      ok: false,
      message: "Server error",
      error: err.message
    });
  }
};

// Suspend all posts by user
export const suspendUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { adminId } = req.body;

    const result = await Post.updateMany(
      { user_id: userId },
      {
        $set: {
          moderation_status: "removed",
          is_visible: false
        },
        $push: {
          moderation_history: {
            action: "removed",
            admin_id: adminId,
            reason: "User suspended",
            timestamp: new Date()
          }
        }
      }
    );

    return res.json({
      ok: true,
      message: `${result.modifiedCount} posts suspended`,
      count: result.modifiedCount
    });
  } catch (err) {
    console.error("Suspend user posts error:", err);
    return res.status(500).json({
      ok: false,
      message: "Server error",
      error: err.message
    });
  }
};
