import { useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS } from "@/types";
import { api } from "@/services/api";

export default function Profile() {
  const { user } = useAuth();

  /* Change password form */
  const [cpForm, setCpForm]     = useState({ current: "", next: "", confirm: "" });
  const [cpError, setCpError]   = useState<string | null>(null);
  const [cpSuccess, setCpSuccess] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setCpError(null);
    setCpSuccess(false);
    if (cpForm.next !== cpForm.confirm) {
      setCpError("New passwords do not match.");
      return;
    }
    if (cpForm.next.length < 8) {
      setCpError("Password must be at least 8 characters.");
      return;
    }
    setCpLoading(true);
    try {
      await api.auth.changePassword(cpForm.current, cpForm.next);
      setCpSuccess(true);
      setCpForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setCpError(err instanceof Error ? err.message : "Failed");
    } finally {
      setCpLoading(false);
    }
  }

  if (!user) return null;

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  return (
    <>
      <div className="page-header">
        <h1>My Profile</h1>
        <p>View and manage your account information.</p>
      </div>

      <div className="page-body" style={{ maxWidth: 640 }}>
        {/* ── Profile card ───────────────────────────────────────────── */}
        <div className="card mb-4">
          <div className="flex items-center gap-4">
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "linear-gradient(135deg,var(--clr-primary),var(--clr-accent))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.4rem", fontWeight: 700, color: "#fff", flexShrink: 0,
            }}>{initials}</div>
            <div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{user.firstName} {user.lastName}</div>
              <div style={{ color: "var(--clr-text-muted)", fontSize: "0.875rem" }}>{user.email}</div>
              <div style={{ marginTop: "0.4rem" }}>
                <span className="badge badge-primary">{ROLE_LABELS[user.role]}</span>
                {" "}
                <span className={user.isActive ? "badge badge-success" : "badge badge-danger"}>
                  {user.isActive ? "Active" : "Disabled"}
                </span>
              </div>
            </div>
          </div>

          <div className="divider" />

          <div className="grid-2" style={{ fontSize: "0.875rem" }}>
            <div>
              <div className="form-label">Account ID</div>
              <div style={{ fontFamily: "monospace", color: "var(--clr-text-muted)", fontSize: "0.8rem", wordBreak: "break-all" }}>{user.id}</div>
            </div>
            <div>
              <div className="form-label">Member since</div>
              <div>{new Date(user.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</div>
            </div>
          </div>
        </div>

        {/* ── Change password ─────────────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Change Password</span>
          </div>
          {cpError   && <div className="alert alert-error mb-4">{cpError}</div>}
          {cpSuccess && <div className="alert alert-success mb-4">Password updated successfully!</div>}
          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input className="form-input" type="password" required
                value={cpForm.current} onChange={(e) => setCpForm(f => ({ ...f, current: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">New Password <span className="form-hint">(min 8 chars)</span></label>
              <input className="form-input" type="password" required minLength={8}
                value={cpForm.next} onChange={(e) => setCpForm(f => ({ ...f, next: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input className="form-input" type="password" required minLength={8}
                value={cpForm.confirm} onChange={(e) => setCpForm(f => ({ ...f, confirm: e.target.value }))} />
            </div>
            <div style={{ marginTop: "0.25rem" }}>
              <button type="submit" className="btn btn-primary" disabled={cpLoading}>
                {cpLoading ? "Updating…" : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
