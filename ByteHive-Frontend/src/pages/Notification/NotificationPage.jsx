// pages/NotificationsPage.jsx
import { useState, useEffect } from "react";
import { deleteNotification, getNotifications } from "../../api/notificationApi";
import { useAuth } from "../../context/auth";
import { useNotifications } from "../../context/NotificationContext";
import { format, isToday, isYesterday } from "date-fns";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout/Layout";
import { navigateFromNotification } from "../../helpers/navigationHelpers";

export default function NotificationPage() {
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const { auth } = useAuth();
  const { notifications, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    markAllAsRead();
  }, []); // run once on mount



  return (
    <Layout>
      <div className="max-w-xl mx-auto w-full">
        <h1 className="text-3xl font-bold my-6 text-white text-center md:text-left ">
          All Notifications
        </h1>

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <p className="text-gray-400 text-center">No notifications yet</p>
          ) : (
            notifications.map((n) => {
              const createdAt = new Date(n.createdAt);
              let displayDate = isToday(createdAt)
                ? `Today at ${format(createdAt, "p")}`
                : isYesterday(createdAt)
                  ? `Yesterday at ${format(createdAt, "p")}`
                  : format(createdAt, "MMM d, yyyy");

              return (
                <div
                  key={n._id}
                  onClick={() => navigate(n.navigate)}
                  className={`cursor-pointer p-4 rounded-xl transition-all duration-300
                    bg-dark-indigo
                    hover:scale-[1.02] hover:shadow-2xl
                  `}
                >
                  <div className="font-medium">{n.message}</div>
                  <div className="text-xs text-gray-400 mt-1">{displayDate}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}
