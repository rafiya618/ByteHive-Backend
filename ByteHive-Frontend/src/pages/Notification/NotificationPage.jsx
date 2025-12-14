// pages/NotificationsPage.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../../context/auth";
import { useNotifications } from "../../context/NotificationContext";
import { format, isToday, isYesterday } from "date-fns";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout/Layout";

export default function NotificationPage() {
  const [loading, setLoading] = useState(false);
  const { auth } = useAuth();
  const { notifications, markAllAsRead, deleteNotif } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    markAllAsRead();
  }, []); // run once on mount

  const handleDelete = async (notificationId, e) => {
    e.stopPropagation(); // Prevent click event from bubbling up
    try {
      await deleteNotif(notificationId);
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const groupNotificationsByDate = () => {
    const grouped = {
      today: [],
      yesterday: [],
      older: []
    };

    notifications.forEach((n) => {
      const createdAt = new Date(n.createdAt);
      if (isToday(createdAt)) {
        grouped.today.push(n);
      } else if (isYesterday(createdAt)) {
        grouped.yesterday.push(n);
      } else {
        grouped.older.push(n);
      }
    });

    return grouped;
  };

  const grouped = groupNotificationsByDate();

  const getNotificationIcon = (triggerType) => {
    switch (triggerType) {
      case 'system':
        return '⚙️';
      case 'streak_warning':
        return '🔥';
      case 'like':
        return '❤️';
      case 'comment':
        return '💬';
      case 'follow':
        return ' 👤';
      case 'mention':
        return '@';
      default:
        return '🔔';
    }
  };

  const renderNotificationGroup = (title, notifs) => {
    if (notifs.length === 0) return null;

    return (
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-3">{title}</h2>
        <div className="space-y-3">
          {notifs.map((n) => {
            const createdAt = new Date(n.createdAt);
            const displayTime = format(createdAt, "h:mm a");

            return (
              <div
                key={n._id}
                className={`group p-4 rounded-xl transition-all duration-300 relative
                  ${n.status === 'unread'
                    ? 'bg-linear-to-r from-purple-900/30 to-indigo-900/30 border-2 border-purple-500/30'
                    : 'bg-dark-indigo border-2 border-gray-800'}
                  hover:shadow-2xl hover:border-purple-500/50
                `}
              >
                {/* Delete Button */}
                <button
                  onClick={(e) => handleDelete(n._id, e)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity
                    bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-300
                    p-2 rounded-lg text-sm font-semibold"
                  title="Delete notification"
                >
                  ✕
                </button>

                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="text-2xl shrink-0">
                    {getNotificationIcon(n.triggerType)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white leading-relaxed">
                      {n.message}
                    </p>

                    {/* Metadata */}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-400">{displayTime}</span>
                      {n.status === 'unread' && (
                        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-semibold">
                          New
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto w-full px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🔔 Notifications
          </h1>
          <p className="text-gray-400">
            Stay updated with your activity and system updates
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            <p className="text-gray-400 mt-4">Loading notifications...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && notifications.length === 0 && (
          <div className="text-center py-16 bg-dark-indigo rounded-2xl border-2 border-gray-800">
            <div className="text-6xl mb-4">🔕</div>
            <h3 className="text-2xl font-bold text-white mb-2">All caught up!</h3>
            <p className="text-gray-400">
              You don't have any notifications right now.
            </p>
          </div>
        )}

        {/* Notifications Grouped by Date */}
        {!loading && notifications.length > 0 && (
          <>
            {renderNotificationGroup("Today", grouped.today)}
            {renderNotificationGroup("Yesterday", grouped.yesterday)}
            {renderNotificationGroup("Earlier", grouped.older)}
          </>
        )}
      </div>
    </Layout>
  );
}
