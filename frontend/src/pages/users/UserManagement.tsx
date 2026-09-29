import { useState, useEffect } from "react";
import { api } from "@/services/api";
import type { User, Role } from "@/types";
import { ROLE_LABELS } from "@/types";
import { useAuth } from "@/context/AuthContext";
import BulkImportModal from "./BulkImportModal";
import ResetPasswordModal from "./ResetPasswordModal";

const ROLES: Role[] = ["super_admin", "registrar", "teacher", "student", "guardian"];

function roleBadgeClass(role: Role) {
  return {
    super_admin: "badge badge-indigo",
    registrar:   "badge badge-primary",
    teacher:     "badge badge-success",
    student:     "badge badge-warning",
    guardian:    "badge badge-neutral",
  }[role] ?? "badge badge-neutral";
}

/* ── Create User Modal ─────────────────────────────────────────────────── */
function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: (u: User) => void }) {
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "", role: "teacher" as Role });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const newUser = await api.users.create(form);
      onCreated(newUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#0f172a" }}>
              Create New User Account
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: "0.8rem", color: "#64748b" }}>
              Add a new faculty, staff, or administrative account to Kalilangan NHS SMS.
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert alert-error mb-4">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input
                className="form-input"
                placeholder="e.g. Maria"
                value={form.firstName}
                required
                onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input
                className="form-input"
                placeholder="e.g. Santos"
                value={form.lastName}
                required
                onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "0.75rem" }}>
            <label className="form-label">Email Address</label>
            <input
              className="form-input"
              type="email"
              placeholder="e.g. maria.santos@deped.gov.ph"
              value={form.email}
              required
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>

          <div className="form-group" style={{ marginBottom: "0.75rem" }}>
            <label className="form-label">
              Password <span className="form-hint">(minimum 8 characters)</span>
            </label>
            <input
              className="form-input"
              type="password"
              placeholder="Enter strong password"
              value={form.password}
              required
              minLength={8}
              onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
            />
          </div>

          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label className="form-label">System Role & Permissions</label>
            <select
              className="form-select"
              value={form.role}
              onChange={(e) => setForm(f => ({ ...f, role: e.target.value as Role }))}
            >
              {ROLES.map(r => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Creating Account…" : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main User Management Page ─────────────────────────────────────────── */
export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [showCreate, setShowCreate] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    api.users.list()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function toggleActive(targetUser: User) {
    setTogglingId(targetUser.id);
    try {
      await api.users.setActive(targetUser.id, !targetUser.isActive);
      setUsers(us => us.map(u => u.id === targetUser.id ? { ...u, isActive: !u.isActive } : u));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to toggle status");
    } finally {
      setTogglingId(null);
    }
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q);
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const isSuperAdmin = currentUser?.role === "super_admin";
  const canManage = isSuperAdmin || currentUser?.role === "registrar";

  // KPI Calculations
  const totalAccounts = users.length;
  const activeCount = users.filter(u => u.isActive).length;
  const teachersCount = users.filter(u => u.role === "teacher").length;
  const adminCount = users.filter(u => u.role === "super_admin" || u.role === "registrar").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* ── Sub-Header & Actions ────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
            User Management
          </h1>
          <p style={{ margin: "3px 0 0", fontSize: "0.825rem", color: "#64748b" }}>
            Manage faculty, administrative personnel, and system credentials for Kalilangan National High School.
          </p>
        </div>

        {canManage && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowBulkImport(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
              }}
            >
              <span>📥</span>
              <span>Bulk CSV Import</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowCreate(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
              }}
            >
              <span>+</span>
              <span>Create Account</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Top KPI Stat Cards ──────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem",
        }}
      >
        {/* KPI 1: Total Users */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "1rem 1.25rem",
            border: "1px solid #e9edf4",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.02)",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#eff6ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              flexShrink: 0,
            }}
          >
            👥
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>
              Total Accounts
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
              {loading ? "..." : totalAccounts}
            </div>
          </div>
        </div>

        {/* KPI 2: Active Personnel */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "1rem 1.25rem",
            border: "1px solid #e9edf4",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.02)",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#ecfdf5",
              color: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              flexShrink: 0,
            }}
          >
            ✅
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>
              Active Personnel
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#059669", lineHeight: 1.1 }}>
              {loading ? "..." : activeCount}
            </div>
          </div>
        </div>

        {/* KPI 3: Teaching Faculty */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "1rem 1.25rem",
            border: "1px solid #e9edf4",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.02)",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#f5f3ff",
              color: "#8b5cf6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              flexShrink: 0,
            }}
          >
            👨‍🏫
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>
              Faculty Teachers
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#8b5cf6", lineHeight: 1.1 }}>
              {loading ? "..." : teachersCount}
            </div>
          </div>
        </div>

        {/* KPI 4: Admins & Registrars */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "1rem 1.25rem",
            border: "1px solid #e9edf4",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.02)",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#fef3c7",
              color: "#d97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              flexShrink: 0,
            }}
          >
            🛡️
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>
              Admins & Registrars
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#d97706", lineHeight: 1.1 }}>
              {loading ? "..." : adminCount}
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* ── Table Card Container ────────────────────────────────────────── */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e9edf4",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.02)",
          overflow: "hidden",
        }}
      >
        {/* Toolbar Bar */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid #e9edf4",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
            background: "#ffffff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            {/* Search Input */}
            <div style={{ position: "relative", width: "280px" }}>
              <input
                className="form-input"
                style={{ paddingLeft: "2.2rem" }}
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span
                style={{
                  position: "absolute",
                  left: "0.85rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                  fontSize: "0.85rem",
                  pointerEvents: "none",
                }}
              >
                🔍
              </span>
            </div>

            {/* Role Filter */}
            <select
              className="form-select"
              style={{ width: "160px" }}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as Role | "")}
            >
              <option value="">All Roles</option>
              {ROLES.map(r => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
            Showing <strong>{filtered.length}</strong> of <strong>{users.length}</strong> accounts
          </div>
        </div>

        {/* Table Content */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>
                  Staff Name
                </th>
                <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>
                  Email Address
                </th>
                <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>
                  Role & Access
                </th>
                <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>
                  Account Status
                </th>
                <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>
                  Registered
                </th>
                {canManage && (
                  <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
                    <div style={{ display: "inline-block", width: "24px", height: "24px", border: "2px solid #2563eb", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginBottom: "0.5rem" }} />
                    <div>Loading user accounts…</div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
                    <div style={{ fontSize: "1.5rem", marginBottom: "0.35rem" }}>🔍</div>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>No accounts found</div>
                    <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "2px" }}>
                      Try adjusting your search query or role filter.
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(u => (
                  <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "0.85rem 1.25rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background: u.role === "teacher" ? "#eff6ff" : u.role === "super_admin" ? "#fdf4ff" : "#ecfdf5",
                            color: u.role === "teacher" ? "#2563eb" : u.role === "super_admin" ? "#c026d3" : "#059669",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            flexShrink: 0,
                            border: "1px solid rgba(0,0,0,0.06)",
                          }}
                        >
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.875rem" }}>
                            {u.firstName} {u.lastName}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                            ID: {u.id.substring(0, 8)}…
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem", color: "#475569", fontSize: "0.85rem" }}>
                      {u.email}
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem" }}>
                      <span className={roleBadgeClass(u.role)}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "999px",
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          background: u.isActive ? "#ecfdf5" : "#fff1f2",
                          color: u.isActive ? "#059669" : "#e11d48",
                          border: `1px solid ${u.isActive ? "#d1fae5" : "#ffe4e6"}`,
                        }}
                      >
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: u.isActive ? "#10b981" : "#ef4444",
                          }}
                        />
                        <span>{u.isActive ? "Active" : "Disabled"}</span>
                      </span>
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem", color: "#64748b", fontSize: "0.8rem" }}>
                      {new Date(u.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    {canManage && (
                      <td style={{ padding: "0.85rem 1.25rem", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                          {!(currentUser?.role === "registrar" && u.role === "super_admin") && (
                            <>
                              <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => setResetPasswordUser(u)}
                                style={{ padding: "0.25rem 0.65rem", fontSize: "0.75rem" }}
                                title="Reset User Password"
                              >
                                <span>🔑</span>
                                <span>Reset</span>
                              </button>
                              {u.id !== currentUser?.id && (
                                <button
                                  type="button"
                                  className={`btn ${u.isActive ? "btn-outline" : "btn-primary"}`}
                                  disabled={togglingId === u.id}
                                  onClick={() => toggleActive(u)}
                                  style={{ padding: "0.25rem 0.65rem", fontSize: "0.75rem" }}
                                >
                                  {togglingId === u.id ? "…" : u.isActive ? "Disable" : "Enable"}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={(u) => { setUsers(us => [u, ...us]); setShowCreate(false); }}
        />
      )}

      {showBulkImport && (
        <BulkImportModal
          onClose={() => setShowBulkImport(false)}
          onSuccess={(newUsers) => {
            setUsers((prev) => [...newUsers, ...prev]);
          }}
        />
      )}

      {resetPasswordUser && (
        <ResetPasswordModal
          user={resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
        />
      )}
    </div>
  );
}
