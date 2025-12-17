import mongoose from 'mongoose';

/**
 * ViewTracking Model - Single Source of Truth for Post View Sessions
 * 
 * Tracks unique user views per post per session (daily reset)
 * Prevents view inflation by ensuring one view per user per day
 */
const viewTrackingSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
        index: true
    },
    post_id: {
        type: String,
        required: true,
        index: true
    },
    viewed_at: {
        type: Date,
        default: Date.now,
        index: true
    },
    session_date: {
        type: String, // Format: YYYY-MM-DD
        required: true,
        index: true
    }
}, {
    timestamps: true
});

// Compound index for efficient lookups
viewTrackingSchema.index({ user_id: 1, post_id: 1, session_date: 1 }, { unique: true });

// TTL index - automatically delete records older than 30 days
viewTrackingSchema.index({ viewed_at: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

/**
 * Check if user has already viewed this post today
 * @param {string} userId - User ID
 * @param {string} postId - Post ID
 * @returns {Promise<boolean>} - True if already viewed today
 */
viewTrackingSchema.statics.hasViewedToday = async function (userId, postId) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const normalizedUserId = String(userId);
    const normalizedPostId = String(postId);

    const existing = await this.findOne({
        user_id: normalizedUserId,
        post_id: normalizedPostId,
        session_date: today
    });

    return !!existing;
};

/**
 * Record a view for this user-post-session combination
 * Uses upsert to handle race conditions gracefully
 * @param {string} userId - User ID
 * @param {string} postId - Post ID
 * @returns {Promise<{isNew: boolean, doc: Object}>} - Whether this was a new view
 */
viewTrackingSchema.statics.recordView = async function (userId, postId) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const normalizedUserId = String(userId);
    const normalizedPostId = String(postId);

    try {
        const result = await this.findOneAndUpdate(
            {
                user_id: normalizedUserId,
                post_id: normalizedPostId,
                session_date: today
            },
            {
                $setOnInsert: {
                    user_id: normalizedUserId,
                    post_id: normalizedPostId,
                    session_date: today,
                    viewed_at: new Date()
                }
            },
            {
                upsert: true,
                new: true,
                lean: true
            }
        );

        // Check if this was a new insert (not an update)
        const isNew = result && !result.viewed_at; // If viewed_at wasn't set, it's new

        return { isNew, doc: result };
    } catch (error) {
        // Handle duplicate key error (race condition)
        if (error.code === 11000) {
            return { isNew: false, doc: null };
        }
        throw error;
    }
};

const ViewTracking = mongoose.model('ViewTracking', viewTrackingSchema);

export default ViewTracking;
