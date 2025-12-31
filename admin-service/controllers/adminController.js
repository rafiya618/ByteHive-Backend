// GET all users with pagination and filters
export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", role = "" } = req.query;

    // TODO: Implement user fetching from auth-service
    res.status(200).json({
      ok: true,
      message: "Fetching users",
      users: [],
      total: 0,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};

// UPDATE user status (block/unblock, promote, etc)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // action: block, unblock, promote, demote

    // TODO: Implement user update in auth-service
    res.status(200).json({
      ok: true,
      message: `User ${action} successful`
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};
