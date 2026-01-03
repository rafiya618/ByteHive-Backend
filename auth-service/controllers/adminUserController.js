import { userModel } from '../models/userModel.js';
import { createRedisClients } from "../../shared-config/redisClient.js";
const { pub } = await createRedisClients();

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
    const user = await userModel.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.status = user.status === 'active' ? 'blocked' : 'active';
    await user.save();

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
    const user = await userModel.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.role = 'admin';
    await user.save();

    res.json({ message: 'User promoted to admin', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /admin/users/:id
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userModel.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

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
