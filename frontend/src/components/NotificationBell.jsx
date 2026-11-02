
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CheckCheck,
  Check,
  X,
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const notificationRef = useRef(null);

  // Close notification panel when clicking outside
  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // Load notification history from PostgreSQL
  const fetchNotifications = async () => {
    const currentToken = localStorage.getItem("trackflow_token");

    if (!currentToken) return;

    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/notifications`,
        {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Could not load notifications");
      }

      const data = await response.json();

      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error("Notification loading error:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Receive instant notifications from OrderContext
    const handleNewNotification = (event) => {
      const notification = event.detail;

      if (!notification) return;

      setNotifications((previous) => {
        if (
          notification.id &&
          previous.some(
            (item) => String(item.id) === String(notification.id)
          )
        ) {
          return previous;
        }

        return [
          {
            ...notification,
            is_read: false,
            created_at:
              notification.createdAt || new Date().toISOString(),
          },
          ...previous,
        ];
      });

      setUnreadCount((previous) => previous + 1);
    };

    window.addEventListener(
      "trackflow-notification",
      handleNewNotification
    );

    return () => {
      window.removeEventListener(
        "trackflow-notification",
        handleNewNotification
      );
    };
  }, []);

  // Mark one notification as read
  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(
        `${API_URL}/api/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(
              "trackflow_token"
            )}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Could not mark notification as read");
      }

      setNotifications((previous) =>
        previous.map((item) =>
          String(item.id) === String(notificationId)
            ? { ...item, is_read: true }
            : item
        )
      );

      setUnreadCount((previous) => Math.max(0, previous - 1));
    } catch (error) {
      console.error("Mark notification read error:", error.message);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/notifications/read-all`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(
              "trackflow_token"
            )}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Could not mark notifications as read");
      }

      setNotifications((previous) =>
        previous.map((item) => ({ ...item, is_read: true }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error("Mark all read error:", error.message);
    }
  };

  const formatDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleString();
  };

  return (
    <div className="relative" ref={notificationRef}>
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className="relative flex size-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={isOpen}
      >
        <Bell size={21} />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-[100] mt-3 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:w-[390px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
            <div>
              <h3 className="font-semibold text-slate-900">
                Notifications
              </h3>
              <p className="text-xs text-slate-500">
                {unreadCount} unread notifications
              </p>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  <CheckCheck size={15} />
                  Mark all read
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Close notifications"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-[420px] overflow-y-auto">
            {isLoading && notifications.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">
                Loading notifications...
              </p>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell
                  size={30}
                  className="mx-auto mb-2 text-slate-300"
                />
                <p className="text-sm font-medium text-slate-700">
                  No notifications yet
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  New updates will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notification) => {
                const isRead =
                  notification.is_read ?? notification.isRead ?? false;

                return (
                  <div
                    key={notification.id}
                    className={`border-b border-slate-100 p-4 transition hover:bg-slate-50 ${
                      !isRead ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                        <Bell size={16} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800">
                            {notification.title}
                          </p>

                          {!isRead && (
                            <span className="mt-1 size-2 shrink-0 rounded-full bg-blue-600" />
                          )}
                        </div>

                        <p className="mt-1 text-sm text-slate-600">
                          {notification.message}
                        </p>

                        <p className="mt-2 text-xs text-slate-400">
                          {formatDate(
                            notification.created_at ||
                              notification.createdAt
                          )}
                        </p>

                        {!isRead && (
                          <button
                            type="button"
                            onClick={() => markAsRead(notification.id)}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                          >
                            <Check size={13} />
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 py-3 text-center">
            <button
              type="button"
              onClick={fetchNotifications}
              className="text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              Refresh notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
