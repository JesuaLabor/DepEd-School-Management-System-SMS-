import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS } from "@/types";

/* ── Icons (inline SVG helpers) ─────────────────────────────────────────── */
const Icon = {
  Dashboard: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
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
  Logout: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
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
          <div className="sidebar-section-label">Main</div>
          <NavLink to="/"         end className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
            <Icon.Dashboard /><span>Dashboard</span>
          </NavLink>
          <NavLink to="/students" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
            <Icon.Students /><span>Students</span>
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
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
