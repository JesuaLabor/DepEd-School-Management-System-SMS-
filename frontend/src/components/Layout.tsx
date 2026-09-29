import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS } from "@/types";
import OfflineBanner from "./OfflineBanner";
import CommandPalette from "./CommandPalette";
import NotificationPopover from "./NotificationPopover";

/* ── Crisp Institutional SVG Icons (Matching UI_recommendation.png) ──────── */
const Icon = {
  Dashboard: () => (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Messages: () => (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Announcements: () => (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  ),
  Students: () => (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Sections: () => (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
    </svg>
  ),
  FacultyStaff: () => (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <polyline points="16 11 18 13 22 9"/>
    </svg>
  ),
  Schedule: () => (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Attendance: () => (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Grading: () => (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  Enrollment: () => (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
      <path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  ),
  SchoolForms: () => (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>
  ),
  ReportsAnalytics: () => (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  Users: () => (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Settings: () => (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Search: () => (
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Bell: () => (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Portal: () => (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
  ),
};

export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const isAdmin = user?.role === "super_admin" || user?.role === "registrar";
  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : "AR";

  // Global shortcut: ⌘K or Ctrl+K opens Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Dynamic greeting based on current time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="app-layout" style={{ background: "#0c1427" }}>
      {/* ── Sidebar Matching UI_recommendation.png ───────────────────────── */}
      <aside
        className="sidebar"
        style={{
          width: "250px",
          background: "#0c1427",
          borderRight: "1px solid #1a2744",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          zIndex: 100,
        }}
      >
        {/* Brand */}
        <div
          className="sidebar-brand"
          style={{
            padding: "1.25rem 1.4rem",
            borderBottom: "1px solid #1a2744",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <img
            src="/knhs_logo.png"
            alt="KNHS Logo"
            style={{
              width: "42px",
              height: "42px",
              objectFit: "contain",
              borderRadius: "50%",
              background: "#ffffff",
              padding: "2px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
              flexShrink: 0,
            }}
          />
          <div className="sidebar-brand-text">
            <strong style={{ display: "block", fontSize: "0.95rem", color: "#f8fafc", fontWeight: 800 }}>KNHS SMS</strong>
            <span style={{ fontSize: "0.72rem", color: "#8fa3bf" }}>Kalilangan National High School</span>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="sidebar-nav" style={{ flex: 1, padding: "1rem 0.85rem", overflowY: "auto" }}>
          {user?.role === "student" || user?.role === "guardian" ? (
            <>
              <div className="sidebar-section-label" style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", color: "#64748b", padding: "0.5rem 0.75rem", textTransform: "uppercase" }}>
                Portal
              </div>
              <NavLink to="/portal" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
                <Icon.Portal /><span>{user.role === "guardian" ? "Parent Portal" : "Learner Portal"}</span>
              </NavLink>
              <NavLink to="/messages" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
                <Icon.Messages /><span>Messages</span>
              </NavLink>
              <NavLink to="/announcements" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
                <Icon.Announcements /><span>Bulletins & Notices</span>
              </NavLink>
            </>
          ) : (
            <>
              {/* ── MAIN ────────────────────────────────────────── */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) => `sidebar-item-link ${isActive ? "is-active" : ""}`}
                >
                  <Icon.Dashboard />
                  <span>Dashboard</span>
                </NavLink>

                <NavLink
                  to="/messages"
                  className={({ isActive }) => `sidebar-item-link ${isActive ? "is-active" : ""}`}
                >
                  <Icon.Messages />
                  <span>Messages</span>
                  <span
                    style={{
                      marginLeft: "auto",
                      background: "#ef4444",
                      color: "#fff",
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: "999px",
                      lineHeight: "1.2",
                    }}
                  >
                    3
                  </span>
                </NavLink>

                <NavLink
                  to="/announcements"
                  className={({ isActive }) => `sidebar-item-link ${isActive ? "is-active" : ""}`}
                >
                  <Icon.Announcements />
                  <span>Announcements</span>
                </NavLink>
              </div>

              {/* ── ACADEMICS ───────────────────────────────────── */}
              <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", color: "#546985", padding: "1.1rem 0.75rem 0.35rem", textTransform: "uppercase" }}>
                Academics
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <NavLink to="/students" className={({ isActive }) => `sidebar-item-link ${isActive ? "is-active" : ""}`}>
                  <Icon.Students />
                  <span>Students</span>
                </NavLink>
                <NavLink to="/sections" className={({ isActive }) => `sidebar-item-link ${isActive ? "is-active" : ""}`}>
                  <Icon.Sections />
                  <span>Classes & Sections</span>
                </NavLink>
                <NavLink to="/schedules/teachers" className={({ isActive }) => `sidebar-item-link ${isActive ? "is-active" : ""}`}>
                  <Icon.FacultyStaff />
                  <span>Faculty & Staff</span>
                </NavLink>
                <NavLink to="/schedules/teachers" className={({ isActive }) => `sidebar-item-link ${isActive ? "is-active" : ""}`}>
                  <Icon.Schedule />
                  <span>Faculty Schedules</span>
                </NavLink>
                <NavLink to="/attendance" className={({ isActive }) => `sidebar-item-link ${isActive ? "is-active" : ""}`}>
                  <Icon.Attendance />
                  <span>Attendance</span>
                </NavLink>
                <NavLink to="/grading" className={({ isActive }) => `sidebar-item-link ${isActive ? "is-active" : ""}`}>
                  <Icon.Grading />
                  <span>Grading & SF9</span>
                </NavLink>
              </div>

              {/* ── SCHOOL OPERATIONS ───────────────────────────── */}
              <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", color: "#546985", padding: "1.1rem 0.75rem 0.35rem", textTransform: "uppercase" }}>
                School Operations
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {isAdmin && (
                  <NavLink to="/enrollments" className={({ isActive }) => `sidebar-item-link ${isActive ? "is-active" : ""}`}>
                    <Icon.Enrollment />
                    <span>Enrollments</span>
                  </NavLink>
                )}
                <NavLink to="/school-forms" className={({ isActive }) => `sidebar-item-link ${isActive ? "is-active" : ""}`}>
                  <Icon.SchoolForms />
                  <span>School Forms</span>
                </NavLink>
                <NavLink to="/school-forms" className={({ isActive }) => `sidebar-item-link ${isActive ? "is-active" : ""}`}>
                  <Icon.ReportsAnalytics />
                  <span>Reports & Analytics</span>
                </NavLink>
              </div>

              {/* ── ADMINISTRATION ──────────────────────────────── */}
              {isAdmin && (
                <>
                  <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", color: "#546985", padding: "1.1rem 0.75rem 0.35rem", textTransform: "uppercase" }}>
                    Administration
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <NavLink to="/users" className={({ isActive }) => `sidebar-item-link ${isActive ? "is-active" : ""}`}>
                      <Icon.Users />
                      <span>User Management</span>
                    </NavLink>
                    <NavLink to="/profile" className={({ isActive }) => `sidebar-item-link ${isActive ? "is-active" : ""}`}>
                      <Icon.Settings />
                      <span>System Settings</span>
                    </NavLink>
                  </div>
                </>
              )}
            </>
          )}
        </nav>

        {/* Profile Footer Matching UI_recommendation.png */}
        <div
          style={{
            padding: "0.85rem 1rem",
            borderTop: "1px solid #1a2744",
            background: "#09101f",
          }}
        >
          <div
            onClick={() => navigate("/profile")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "#2563eb",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.85rem",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user ? `${user.firstName} ${user.lastName}` : "Alejandro Roces"}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#8fa3bf" }}>
                {user ? ROLE_LABELS[user.role] : "Super Admin"}
              </div>
            </div>
            <div style={{ color: "#64748b" }}>
              <Icon.ChevronRight />
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Canvas ─────────────────────────────────────────────────── */}
      <main
        className="main-content"
        style={{
          marginLeft: "250px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          background: "#f4f6fb",
        }}
      >
        <OfflineBanner />

        {/* ── Top Header Bar Matching UI_recommendation.png ──────────────── */}
        <header
          style={{
            height: "70px",
            background: "#0c1427",
            borderBottom: "1px solid #1a2744",
            padding: "0 2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 90,
          }}
        >
          {/* Left: Greeting & School Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.4rem" }}>👋</span>
            <div>
              <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#ffffff", lineHeight: 1.2 }}>
                {greeting}, {user?.firstName || "Alejandro"}!
              </h1>
              <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#8fa3bf" }}>
                Kalilangan National High School &nbsp;·&nbsp;{" "}
                <span style={{ color: "#fbbf24", fontWeight: 600 }}>
                  {user ? ROLE_LABELS[user.role] : "Super Admin"}
                </span>
              </p>
            </div>
          </div>

          {/* Right: Search Bar, Notifications, Profile Avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {/* Search Input (Triggers Command Palette) */}
            <div
              onClick={() => setShowCommandPalette(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "#17233d",
                border: "1px solid #2a3b5c",
                borderRadius: "9999px",
                padding: "0.45rem 1rem",
                width: "320px",
                color: "#94a3b8",
                fontSize: "0.825rem",
                cursor: "pointer",
                transition: "border-color 0.2s, background 0.2s",
              }}
              title="Click or press ⌘K to open command search"
            >
              <Icon.Search />
              <input
                type="text"
                readOnly
                placeholder="Search students, sections, or features..."
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#f1f5f9",
                  fontSize: "0.78rem",
                  width: "100%",
                  cursor: "pointer",
                }}
              />
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: "0.68rem",
                  background: "#22334d",
                  color: "#93c5fd",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  border: "1px solid #33496b",
                  whiteSpace: "nowrap",
                }}
              >
                ⌘K
              </span>
            </div>

            {/* Notification Bell with Badge & Interactive Popover */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setShowNotifications((prev) => !prev)}
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  background: showNotifications ? "#2563eb" : "#17233d",
                  border: "1px solid #2a3b5c",
                  color: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "background 0.2s ease",
                }}
                title="Notifications & System Alerts"
              >
                <Icon.Bell />
              </button>
              <span
                style={{
                  position: "absolute",
                  top: "-2px",
                  right: "-2px",
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  background: "#ef4444",
                  color: "#ffffff",
                  fontSize: "0.65rem",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid #0c1427",
                  pointerEvents: "none",
                }}
              >
                3
              </span>

              {/* Notification Popover Dropdown */}
              <NotificationPopover
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
              />
            </div>

            {/* Avatar Pill */}
            <button
              type="button"
              onClick={() => navigate("/profile")}
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                background: "#2563eb",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.85rem",
                border: "2px solid rgba(255,255,255,0.2)",
                cursor: "pointer",
              }}
              title="Open Profile"
            >
              {initials}
            </button>
          </div>
        </header>

        {/* Content Viewport */}
        <div style={{ flex: 1, padding: "1.5rem 2rem", background: "#f4f6fb" }}>
          <Outlet />
        </div>
      </main>

      {/* Global ⌘K Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
      />
    </div>
  );
}
