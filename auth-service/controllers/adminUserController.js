import { userModel } from '../models/userModel.js';
import { createRedisClients } from "../config/redisClient.js";
const { pub } = await createRedisClients();

const getAdminId = (req) => req.user?.id || req.user?._id || req.user?.userId || 'admin-system';

const publishAdminNotification = async ({ receiverId, senderId, message, entityId, receiverEmail }) => {
  const notificationPayload = {
    receiverId: receiverId?.toString(),
    senderId: senderId?.toString(),
    triggerType: 'admin_action',
    triggerId: `admin-action-${Date.now()}`,
    entityType: 'user',
    entityId: entityId?.toString() || receiverId?.toString(),
    receiverEmail,
    message,
  };

  await pub.publish('notification:event', JSON.stringify({ notificationPayload }));
};

// GET /admin/users?cursor=&limit=&search=&role=&status=
export const getUsers = async (req, res) => {
  try {
    const { cursor, limit = 10, search, role, status } = req.query;
    const query = {};

    // Filters
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { name: regex },
        { username: regex },
        { email: regex }
      ];
    }

    // Cursor pagination
    if (cursor) query._id = { $gt: cursor };

    const users = await userModel
      .find(query)
      .sort({ _id: 1 })
      .limit(Number(limit));

    const nextCursor = users.length ? users[users.length - 1]._id : null;

    res.json({ users, nextCursor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /admin/users/:id/block
export const toggleBlockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = getAdminId(req);
    const user = await userModel.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isUnblocking = user.status === 'blocked';
    user.status = isUnblocking ? 'active' : 'blocked';

    // Keep moderation flags consistent with block/unblock actions.
    if (isUnblocking) {
      user.isSuspended = false;
      user.suspendedUntil = null;
      user.suspensionReason = '';
      user.moderationHistory.push({
        action: 'unbanned',
        admin_id: adminId,
        reason: 'Unblocked from admin users page',
        timestamp: new Date()
      });
    }

    await user.save();

    const isBlocked = user.status === 'blocked';
    await publishAdminNotification({
      receiverId: user._id,
      senderId: adminId,
      entityId: user._id,
      receiverEmail: user.email,
      message: isBlocked
        ? 'Your account has been blocked by an admin.'
        : 'Your account has been unblocked by an admin.',
    });

    res.json({ message: `User is now ${user.status}`, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /admin/users/:id/promote
export const promoteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = getAdminId(req);
    const user = await userModel.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isPromoting = user.role !== 'admin';
    user.role = isPromoting ? 'admin' : 'user';
    await user.save();

    await publishAdminNotification({
      receiverId: user._id,
      senderId: adminId,
      entityId: user._id,
      receiverEmail: user.email,
      message: isPromoting
        ? 'You have been promoted to admin.'
        : 'Your admin role has been revoked.',
    });

    res.json({
      message: isPromoting ? 'User promoted to admin' : 'User demoted to user',
      user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /admin/users/:id
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = getAdminId(req);
    const user = await userModel.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await publishAdminNotification({
      receiverId: user._id,
      senderId: adminId,
      entityId: user._id,
      receiverEmail: user.email,
      message: 'Your account has been deleted by an admin.',
    });

    await user.deleteOne();

    await pub.publish(
      "dashboard:stats",
      JSON.stringify({
        type: "user_deleted" // or user_deleted, post_created, etc.
      })
    );
    res.json({ message: 'User deleted successfully', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
