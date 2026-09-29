import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "warning" | "info" | "success" | "alert";
  time: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: "SARDO Early Warning Triggered",
    message: "2 learners in Grade 10 - Rizal have accumulated 5+ consecutive unexcused absences.",
    type: "warning",
    time: "25m ago",
    read: false,
    actionUrl: "/attendance",
    actionLabel: "Review Attendance",
  },
  {
    id: "notif-2",
    title: "New Intake Submissions",
    message: "3 prospective transferees submitted online enrollment forms awaiting document audit.",
    type: "info",
    time: "1h ago",
    read: false,
    actionUrl: "/enrollments",
    actionLabel: "Verify Intake",
  },
  {
    id: "notif-3",
    title: "Q1 Grading Period Closing",
    message: "DepEd DO 8 quarterly grade encoding window closes in 4 school days.",
    type: "alert",
    time: "3h ago",
    read: false,
    actionUrl: "/grading",
    actionLabel: "Open Grade Sheets",
  },
  {
    id: "notif-4",
    title: "Division SF2 Export Synchronized",
    message: "Monthly attendance summary (Form SF2) was verified and packaged for Division submission.",
    type: "success",
    time: "Yesterday",
    read: true,
    actionUrl: "/school-forms",
    actionLabel: "View School Forms",
  },
];

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement>;
}

export default function NotificationPopover({ isOpen, onClose }: NotificationPopoverProps) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const popoverRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close on Escape or click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleAction = (item: NotificationItem) => {
    markAsRead(item.id);
    onClose();
    if (item.actionUrl) {
      navigate(item.actionUrl);
    }
  };

  const filteredItems = notifications.filter((item) =>
    activeTab === "unread" ? !item.read : true
  );

  return (
    <div
      ref={popoverRef}
      style={{
        position: "absolute",
        top: "54px",
        right: "0",
        width: "380px",
        maxWidth: "92vw",
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: "16px",
        boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)",
        zIndex: 200,
        overflow: "hidden",
        animation: "slideDown 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem 1.25rem",
          borderBottom: "1px solid #1e293b",
          background: "#0c1322",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.1rem" }}>🔔</span>
          <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "#f8fafc" }}>
            Notifications & Alerts
          </span>
          {unreadCount > 0 && (
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                background: "#ef4444",
                color: "#ffffff",
                padding: "2px 7px",
                borderRadius: "9999px",
              }}
            >
              {unreadCount} new
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            style={{
              background: "transparent",
              border: "none",
              color: "#38bdf8",
              fontSize: "0.74rem",
              fontWeight: 600,
              cursor: "pointer",
              padding: "2px 6px",
              borderRadius: "4px",
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          padding: "0.5rem 1.25rem",
          background: "#0c1322",
          borderBottom: "1px solid #1e293b",
          gap: "0.5rem",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          style={{
            background: activeTab === "all" ? "#1e293b" : "transparent",
            color: activeTab === "all" ? "#ffffff" : "#94a3b8",
            border: "none",
            borderRadius: "6px",
            padding: "4px 10px",
            fontSize: "0.75rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("unread")}
          style={{
            background: activeTab === "unread" ? "#1e293b" : "transparent",
            color: activeTab === "unread" ? "#ffffff" : "#94a3b8",
            border: "none",
            borderRadius: "6px",
            padding: "4px 10px",
            fontSize: "0.75rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notification List */}
      <div
        style={{
          maxHeight: "360px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {filteredItems.length === 0 ? (
          <div style={{ padding: "2.5rem 1.5rem", textAlign: "center", color: "#64748b" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✨</div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#94a3b8" }}>You're all caught up!</div>
            <div style={{ fontSize: "0.75rem", marginTop: "2px" }}>No unread notifications or active advisories.</div>
          </div>
        ) : (
          filteredItems.map((item) => {
            const typeColor =
              item.type === "warning"
                ? "#f59e0b"
                : item.type === "alert"
                ? "#ef4444"
                : item.type === "success"
                ? "#10b981"
                : "#38bdf8";

            const typeBadge =
              item.type === "warning"
                ? "⚠️ SARDO Warning"
                : item.type === "alert"
                ? "🚨 Critical Deadline"
                : item.type === "success"
                ? "✅ System"
                : "ℹ️ Admissions";

            return (
              <div
                key={item.id}
                onClick={() => handleAction(item)}
                style={{
                  padding: "0.9rem 1.25rem",
                  borderBottom: "1px solid #1e293b",
                  background: item.read ? "transparent" : "rgba(37, 99, 235, 0.07)",
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "flex-start",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = item.read ? "transparent" : "rgba(37, 99, 235, 0.07)";
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: item.read ? "transparent" : "#38bdf8",
                    marginTop: "6px",
                    flexShrink: 0,
                  }}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", marginBottom: "3px" }}>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        color: typeColor,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {typeBadge}
                    </span>
                    <span style={{ fontSize: "0.68rem", color: "#64748b" }}>{item.time}</span>
                  </div>

                  <div style={{ fontSize: "0.825rem", fontWeight: item.read ? 600 : 700, color: "#f1f5f9", lineHeight: 1.35 }}>
                    {item.title}
                  </div>

                  <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "#94a3b8", lineHeight: 1.4 }}>
                    {item.message}
                  </p>

                  {item.actionLabel && (
                    <div style={{ marginTop: "6px", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.72rem", color: "#38bdf8", fontWeight: 600 }}>
                      <span>{item.actionLabel}</span>
                      <span>→</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "0.75rem 1.25rem",
          background: "#0c1322",
          borderTop: "1px solid #1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          type="button"
          onClick={() => {
            onClose();
            navigate("/announcements");
          }}
          style={{
            background: "transparent",
            border: "none",
            color: "#8fa3bf",
            fontSize: "0.75rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
        >
          <span>View School Bulletins</span>
          <span>↗</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          style={{
            background: "#1e293b",
            border: "1px solid #334155",
            color: "#f1f5f9",
            borderRadius: "6px",
            padding: "4px 10px",
            fontSize: "0.72rem",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
