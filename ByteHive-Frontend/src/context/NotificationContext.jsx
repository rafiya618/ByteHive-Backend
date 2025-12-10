import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./auth";
import { getNotifications, markNotificationAsRead } from "../api/notificationApi";
import socket from "../../Socket";
import { useLocation } from "react-router-dom";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { auth } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unReadCount, setUnReadCount] = useState("");
  const location = useLocation();

  // Join personal room + load existing notifications
  useEffect(() => {
    if (!auth?.user?._id || auth?.user?.onboardingStep !== 4) return;

    const fetchNotifications = async () => {
      try {
        // Join personal room
        socket.emit("joinRoom", { type: "user", id: auth.user._id });

        // Load old notifications
        const { data } = await getNotifications(auth.user._id);
        setNotifications(data.notifications || []);
        setUnReadCount(data.unReadCount || 0);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };

    fetchNotifications();

    let markTimeout;
    // Listen for new notifications
    socket.on("notification:new", (notif) => {
      setNotifications((prev) => {
        const exists = prev.some((n) => n._id === notif._id);
        if (exists) return prev;
        return [notif, ...prev];
      });

      if (location.pathname === "/notification") {
        // If already on notifications page → mark as read (debounced)
        clearTimeout(markTimeout);
        markTimeout = setTimeout(async () => {
          try {
            await markNotificationAsRead(auth.user._id);
            setNotifications((prev) =>
              prev.map((n) => ({ ...n, isRead: true }))
            );
            setUnReadCount("");
          } catch (err) {
            console.error("Failed to mark as read:", err);
          }
        }, 500);
      } else {
        // Otherwise just increment count
        setUnReadCount((prev) => prev + 1);
      }

      console.log("notification", notif);

      
    });

    // Listen for updated (aggregated) notifications
    socket.on("notification:update", (notif) => {
      setNotifications((prev) =>
        prev.map((n) => (n._id === notif._id ? notif : n))
      );
    });

    return () => {
      socket.emit("leaveRoom", { type: "user", id: auth.user._id });
      socket.off("notification:new");
      socket.off("notification:update");
    };
  }, [auth?.user?._id, location.pathname]);

  // Mark all as read
  const markAllAsRead = async () => {
    if (!auth?.user?._id) return;

    await markNotificationAsRead(auth?.user?._id);

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnReadCount("");
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, unReadCount, markAllAsRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
