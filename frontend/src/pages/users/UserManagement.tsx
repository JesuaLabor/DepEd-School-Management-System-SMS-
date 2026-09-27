import { useState, useEffect } from "react";
import { api } from "@/services/api";
import type { User, Role } from "@/types";
import { ROLE_LABELS } from "@/types";
import { useAuth } from "@/context/AuthContext";
import BulkImportModal from "./BulkImportModal";

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
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create User Account</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error mb-4">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="grid-2" style={{ gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input className="form-input" value={form.firstName} required
                onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input className="form-input" value={form.lastName} required
                onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: "0.75rem" }}>
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} required
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="form-group" style={{ marginBottom: "0.75rem" }}>
            <label className="form-label">Password <span className="form-hint">(min 8 chars)</span></label>
            <input className="form-input" type="password" value={form.password} required minLength={8}
              onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="form-group" style={{ marginBottom: "0.75rem" }}>
            <label className="form-label">Role</label>
            <select className="form-select" value={form.role}
              onChange={(e) => setForm(f => ({ ...f, role: e.target.value as Role }))}>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Creating…" : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────── */
export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users,   setUsers]   = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [search,  setSearch]  = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [showCreate, setShowCreate] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    api.users.list()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function toggleActive(user: User) {
    setTogglingId(user.id);
    try {
      await api.users.setActive(user.id, !user.isActive);
      setUsers(us => us.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setTogglingId(null);
    }
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q);
    const matchRole   = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const isSuperAdmin = currentUser?.role === "super_admin";
  const canManage = isSuperAdmin || currentUser?.role === "registrar";

  return (
    <>
      <div className="page-header">
        <h1>User Management</h1>
        <p>Manage staff and system accounts for your school.</p>
      </div>

      <div className="page-body">
        {error && <div className="alert alert-error mb-4">{error}</div>}

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4" style={{ flexWrap: "wrap" }}>
          <input
            className="form-input" style={{ maxWidth: 280 }}
            placeholder="Search by name or email…"
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
          <select className="form-select" style={{ maxWidth: 180 }} value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as Role | "")}>
            <option value="">All roles</option>
            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
            {canManage && (
              <>
                <button
                  className="btn btn-outline"
                  onClick={() => setShowBulkImport(true)}
                  style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <span>📥</span> Bulk CSV Import
                </button>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                  + Create User
                </button>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                {isSuperAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--clr-text-muted)" }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--clr-text-muted)" }}>No users found.</td></tr>
              ) : filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                        background: "linear-gradient(135deg,var(--clr-primary),var(--clr-accent))",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.7rem", fontWeight: 700, color: "#fff",
                      }}>
                        {u.firstName[0]}{u.lastName[0]}
                      </div>
                      <span className="full-name">{u.firstName} {u.lastName}</span>
                    </div>
                  </td>
                  <td style={{ color: "var(--clr-text-muted)", fontSize: "0.85rem" }}>{u.email}</td>
                  <td><span className={roleBadgeClass(u.role)}>{ROLE_LABELS[u.role]}</span></td>
                  <td>
                    <span className={u.isActive ? "badge badge-success" : "badge badge-danger"}>
                      {u.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td style={{ color: "var(--clr-text-muted)", fontSize: "0.8rem" }}>
                    {new Date(u.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                  </td>
                  {isSuperAdmin && (
                    <td>
                      {u.id !== currentUser?.id && (
                        <button
                          className={`btn btn-sm ${u.isActive ? "btn-outline" : "btn-primary"}`}
                          disabled={togglingId === u.id}
                          onClick={() => toggleActive(u)}
                        >
                          {togglingId === u.id ? "…" : u.isActive ? "Disable" : "Enable"}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-muted text-sm mt-2">
          Showing {filtered.length} of {users.length} users
        </p>
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
    </>
  );
}
