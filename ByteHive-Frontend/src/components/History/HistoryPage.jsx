import { useState, useEffect } from "react";
import { getActivityHistory } from "../../api/retentionApi";
import { postsApi } from "../../api/postsApi";

// Action icons and labels mapping
const ACTION_CONFIG = {
  view: { icon: "visibility", label: "Viewed", color: "text-blue-400", bgColor: "bg-blue-400/20" },
  read: { icon: "menu_book", label: "Read", color: "text-blue-500", bgColor: "bg-blue-500/20" },
  like: { icon: "thumb_up", label: "Liked", color: "text-green-400", bgColor: "bg-green-400/20" },
  downvote: { icon: "thumb_down", label: "Downvoted", color: "text-red-400", bgColor: "bg-red-400/20" },
  comment: { icon: "chat_bubble", label: "Commented on", color: "text-purple-400", bgColor: "bg-purple-400/20" },
  comment_view: { icon: "forum", label: "Viewed comment", color: "text-cyan-400", bgColor: "bg-cyan-400/20" },
  post: { icon: "edit_note", label: "Created post", color: "text-yellow-400", bgColor: "bg-yellow-400/20" },
  simplify: { icon: "auto_fix_high", label: "Simplified", color: "text-amber-400", bgColor: "bg-amber-400/20" },
  word_meaning: { icon: "translate", label: "Looked up", color: "text-pink-400", bgColor: "bg-pink-400/20" },
  search: { icon: "search", label: "Searched", color: "text-indigo-400", bgColor: "bg-indigo-400/20" },
};

// Format relative time
const formatRelativeTime = (date) => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
};

// Format full date time
const formatFullDateTime = (date) => {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// Single history event item component
const HistoryEventItem = ({ event, postDetails }) => {
  const config = ACTION_CONFIG[event.activity_type] || ACTION_CONFIG.view;
  const targetTitle = postDetails?.post_title || postDetails?.title || null;
  const targetId = event.target_id || event.post_id;

  // Determine display text based on activity type
  const getDisplayContent = () => {
    if (event.activity_type === 'word_meaning' || event.activity_type === 'search') {
      return event.activity_description || 'Unknown action';
    }
    if (event.activity_type === 'simplify') {
      return targetTitle || event.activity_description || 'Simplified content';
    }
    return targetTitle || 'Unknown content';
  };

  const displayContent = getDisplayContent();
  const hasLink = targetId && ['view', 'read', 'like', 'downvote', 'comment', 'comment_view', 'post', 'simplify'].includes(event.activity_type);

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-900/50 border border-gray-800 rounded-lg hover:bg-gray-800/50 transition-colors">
      {/* Action Icon - Compact */}
      <div className={`shrink-0 w-9 h-9 rounded-lg ${config.bgColor} flex items-center justify-center`}>
        <span className={`material-icons text-lg ${config.color}`}>{config.icon}</span>
      </div>

      {/* Event Details - Minimal */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
          <span className="text-gray-600 text-xs">
            {formatRelativeTime(event.activity_date || event.createdAt)}
          </span>
        </div>
        <p className="text-gray-300 text-sm truncate">{displayContent}</p>
      </div>

      {/* View Post Button */}
      {hasLink && (
        <a
          href={`/post/${targetId}`}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-periwinkle/20 text-periwinkle text-sm rounded-lg hover:bg-periwinkle/30 transition-colors"
        >
          <span className="material-icons text-base">open_in_new</span>
          <span className="hidden sm:inline">View</span>
        </a>
      )}
    </div>
  );
};

const HistoryPage = () => {
  const [activities, setActivities] = useState([]);
  const [postDetailsMap, setPostDetailsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all'); // Filter state
  const limit = 50;

  // Get filtered activities
  const filteredActivities = activeFilter === 'all'
    ? activities
    : activities.filter(a => a.activity_type === activeFilter);

  // Fetch post details for activities
  const fetchPostDetails = async (postIds) => {
    const uniqueIds = [...new Set(postIds.filter(Boolean))];
    const newDetails = {};

    await Promise.all(
      uniqueIds.map(async (postId) => {
        if (!postDetailsMap[postId]) {
          try {
            const response = await postsApi.getPostById(postId);
            newDetails[postId] = response.post || response;
          } catch (err) {
            console.error(`Error fetching post ${postId}:`, err);
            newDetails[postId] = { title: "Post unavailable" };
          }
        }
      })
    );

    if (Object.keys(newDetails).length > 0) {
      setPostDetailsMap((prev) => ({ ...prev, ...newDetails }));
    }
  };

  // Fetch activity history
  const fetchHistory = async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const currentSkip = reset ? 0 : skip;
      console.log("Fetching activity history:", { skip: currentSkip, limit });

      const response = await getActivityHistory(currentSkip, limit);
      console.log("Activity history response:", response);

      const newActivities = response.activities || [];

      if (reset) {
        setActivities(newActivities);
        setSkip(newActivities.length);
      } else {
        setActivities((prev) => [...prev, ...newActivities]);
        setSkip((prev) => prev + newActivities.length);
      }

      setHasMore(newActivities.length === limit);

      // Fetch post details for the new activities
      const postIds = newActivities.map((a) => a.target_id || a.post_id);
      await fetchPostDetails(postIds);

    } catch (err) {
      console.error("Error fetching activity history:", err);
      setError(err.message || "Failed to fetch history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(true);
  }, []);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchHistory(false);
    }
  };

  if (error && activities.length === 0) {
    return (
      <div className="min-h-screen bg-rich-black flex items-center justify-center">
        <div className="text-center">
          <span className="material-icons text-6xl text-red-500 mb-4 block">
            error
          </span>
          <h3 className="font-fenix text-2xl text-white mb-2">
            Something went wrong
          </h3>
          <p className="text-columbia-blue">{error}</p>
          <button
            onClick={() => fetchHistory(true)}
            className="mt-4 px-4 py-2 bg-periwinkle text-white rounded-lg hover:bg-periwinkle/80 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rich-black text-white relative">
      {/* Background Glow Effect */}
      <div
        className="absolute z-0"
        style={{
          width: 637,
          height: 300,
          top: -38,
          left: "50%",
          transform: "translateX(-50%)",
          background: "#1A1842B3",
          filter: "blur(100px)",
          boxShadow: "0px 4px 100px 500px #00000066",
          borderRadius: 30,
          pointerEvents: "none",
        }}
      />

      <div className="container mx-auto px-5 sm:px-7 lg:px-10 py-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-fenix text-[28px] text-white mb-1">
            Activity History
          </h1>
          <p className="text-desc text-base">
            Your complete activity timeline — every action recorded
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="mb-6">
          <p className="text-gray-400 text-sm mb-3">Filter by activity type:</p>
          <div className="flex gap-2 flex-wrap">
            {/* All Button */}
            <button
              onClick={() => setActiveFilter('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${activeFilter === 'all'
                ? 'bg-periwinkle text-white shadow-lg shadow-periwinkle/30'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                }`}
            >
              <span className="material-icons text-sm">apps</span>
              <span className="text-sm font-medium">All</span>
              <span className="text-xs opacity-70">({activities.length})</span>
            </button>

            {/* Activity Type Buttons */}
            {Object.entries(ACTION_CONFIG).map(([key, config]) => {
              const count = activities.filter((a) => a.activity_type === key).length;
              if (count === 0) return null;
              return (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${activeFilter === key
                    ? `${config.bgColor} ${config.color} shadow-lg`
                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                    }`}
                >
                  <span className={`material-icons text-sm ${activeFilter === key ? config.color : ''}`}>
                    {config.icon}
                  </span>
                  <span className="text-sm font-medium capitalize">{key.replace('_', ' ')}</span>
                  <span className="text-xs opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Activity List */}
        {loading && activities.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-icons text-6xl text-columbia-blue animate-spin">
              refresh
            </span>
            <p className="text-columbia-blue mt-4">Loading your activity history...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredActivities.length > 0 ? (
              <>
                {/* Show filter info */}
                {activeFilter !== 'all' && (
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
                    <span>Showing {filteredActivities.length} {activeFilter.replace('_', ' ')} activities</span>
                    <button
                      onClick={() => setActiveFilter('all')}
                      className="text-periwinkle hover:underline"
                    >
                      Clear filter
                    </button>
                  </div>
                )}
                {filteredActivities.map((event, index) => (
                  <HistoryEventItem
                    key={event._id || `${event.activity_type}-${index}`}
                    event={event}
                    postDetails={postDetailsMap[event.target_id || event.post_id]}
                  />
                ))}

                {/* Load More Button */}
                {hasMore && (
                  <div className="text-center pt-4">
                    <button
                      onClick={handleLoadMore}
                      disabled={loading}
                      className="px-6 py-2 bg-periwinkle text-white rounded-lg hover:bg-periwinkle/80 transition-colors disabled:opacity-50"
                    >
                      {loading ? "Loading..." : "Load More"}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <span className="material-icons text-6xl text-columbia-blue mb-4 block">
                  history
                </span>
                <h3 className="font-fenix text-2xl text-white mb-2">
                  No activity yet
                </h3>
                <p className="text-columbia-blue">
                  Start exploring posts to build your activity history
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;