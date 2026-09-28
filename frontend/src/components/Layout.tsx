import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS } from "@/types";
import OfflineBanner from "./OfflineBanner";

/* ── Icons (inline SVG helpers) ─────────────────────────────────────────── */
const Icon = {
  Dashboard: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  Announcements: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  ),
  Students: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  Users: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Profile: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4"/><path d="M6 20v-1a6 6 0 0112 0v1"/>
      <path d="M15 14l2 2 4-4"/>
    </svg>
  ),
  Enrollment: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <path d="M9 12h6M9 16h4"/>
    </svg>
  ),
  Attendance: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <path d="M9 16l2 2 4-4"/>
    </svg>
  ),
  Sections: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18M9 21V9"/>
    </svg>
  ),
  Schedule: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Grading: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  SchoolForms: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>
  ),
  Logout: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
    </svg>
  ),
  Portal: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
  ),
  Messages: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  ),
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const isAdmin = user?.role === "super_admin" || user?.role === "registrar";
  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : "?";

  return (
    <div className="app-layout">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">D</div>
          <div className="sidebar-brand-text">
            <strong>DepEd SMS</strong>
            <span>School Management</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {user?.role === "student" || user?.role === "guardian" ? (
            <>
              <div className="sidebar-section-label">Portal</div>
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
              <div className="sidebar-section-label">Main</div>
              <NavLink to="/"         end className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
                <Icon.Dashboard /><span>Dashboard</span>
              </NavLink>
              <NavLink to="/messages" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
                <Icon.Messages /><span>Messages</span>
              </NavLink>
              <NavLink to="/announcements" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
                <Icon.Announcements /><span>Bulletins & Notices</span>
              </NavLink>
              <NavLink to="/students" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
                <Icon.Students /><span>Students</span>
              </NavLink>
              <NavLink to="/sections" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
                <Icon.Sections /><span>Classes & Sections</span>
              </NavLink>
              <NavLink to="/schedules/teachers" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
                <Icon.Schedule /><span>Faculty Schedules</span>
              </NavLink>
              <NavLink to="/attendance" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
                <Icon.Attendance /><span>Attendance</span>
              </NavLink>
              <NavLink to="/grading" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
                <Icon.Grading /><span>Grading & SF9</span>
              </NavLink>
              <NavLink to="/school-forms" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
                <Icon.SchoolForms /><span>School Forms (SF)</span>
              </NavLink>

              {isAdmin && (
                <>
                  <div className="sidebar-section-label" style={{ marginTop: "0.5rem" }}>Administration</div>
                  <NavLink to="/enrollments" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
                    <Icon.Enrollment /><span>Enrollments</span>
                  </NavLink>
                  <NavLink to="/users" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
                    <Icon.Users /><span>User Management</span>
                  </NavLink>
                </>
              )}
            </>
          )}

          <div className="sidebar-section-label" style={{ marginTop: "0.5rem" }}>Account</div>
          <NavLink to="/profile" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
            <Icon.Profile /><span>Profile</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <strong>{user?.firstName} {user?.lastName}</strong>
              <span>{user ? ROLE_LABELS[user.role] : ""}</span>
            </div>
            <button className="sidebar-logout-btn" onClick={handleLogout} title="Sign out">
              <Icon.Logout />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="main-content" style={{ display: "flex", flexDirection: "column" }}>
        <OfflineBanner />
        <div style={{ flex: 1, padding: "var(--space-6, 1.5rem)" }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
