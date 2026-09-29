import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS } from "@/types";
import { api } from "@/services/api";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  /* Change password form */
  const [cpForm, setCpForm] = useState({ current: "", next: "", confirm: "" });
  const [cpError, setCpError] = useState<string | null>(null);
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
      setCpError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setCpLoading(false);
    }
  }

  if (!user) return null;

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "980px" }}>
      {/* ── Sub-Header ─────────────────────────────────────────────────── */}
      <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "1rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
          Account & Security Settings
        </h1>
        <p style={{ margin: "3px 0 0", fontSize: "0.825rem", color: "#64748b" }}>
          View your DepEd credentials, school assignment details, and manage password security.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "1.5rem", alignItems: "start" }}>
        {/* ── Left Column: Identity & Access Card ────────────────────────── */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e9edf4",
            padding: "1.75rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "#ffffff",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
                {user.firstName} {user.lastName}
              </div>
              <div style={{ color: "#64748b", fontSize: "0.825rem", marginTop: "2px" }}>
                {user.email}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.5rem" }}>
                <span className="badge badge-primary">{ROLE_LABELS[user.role]}</span>
                <span className={user.isActive ? "badge badge-success" : "badge badge-danger"}>
                  {user.isActive ? "Active" : "Disabled"}
                </span>
              </div>
            </div>
          </div>

          <div style={{ height: "1px", background: "#f1f5f9" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "0.825rem" }}>
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                School Assignment
              </div>
              <div style={{ fontWeight: 600, color: "#0f172a", marginTop: "2px" }}>
                Kalilangan National High School
              </div>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                Division of Bukidnon · Region X
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Account Identifier
              </div>
              <div style={{ fontFamily: "monospace", color: "#334155", background: "#f8fafc", padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", marginTop: "3px", fontSize: "0.75rem", wordBreak: "break-all" }}>
                {user.id}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Member Since
              </div>
              <div style={{ color: "#0f172a", marginTop: "2px", fontWeight: 500 }}>
                {new Date(user.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
              </div>
            </div>
          </div>

          <div style={{ height: "1px", background: "#f1f5f9" }} />

          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/login");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#e11d48",
              borderRadius: "10px",
              padding: "0.65rem 1rem",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "background 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#ffe4e6";
              e.currentTarget.style.borderColor = "#fda4af";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fff1f2";
              e.currentTarget.style.borderColor = "#fecdd3";
            }}
          >
            <span>🚪</span>
            <span>Sign Out of KNHS SMS</span>
          </button>
        </div>

        {/* ── Right Column: Password Management Card ─────────────────────── */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e9edf4",
            padding: "1.75rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ marginBottom: "1.25rem" }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
              Change Password
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#64748b" }}>
              Ensure your account is protected with a secure and unique password.
            </p>
          </div>

          {cpError && <div className="alert alert-error mb-4">⚠️ {cpError}</div>}
          {cpSuccess && <div className="alert alert-success mb-4">✅ Password updated successfully!</div>}

          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                className="form-input"
                type="password"
                required
                placeholder="Enter current password"
                value={cpForm.current}
                onChange={(e) => setCpForm(f => ({ ...f, current: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                New Password <span className="form-hint">(minimum 8 characters)</span>
              </label>
              <input
                className="form-input"
                type="password"
                required
                minLength={8}
                placeholder="Enter new password"
                value={cpForm.next}
                onChange={(e) => setCpForm(f => ({ ...f, next: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                className="form-input"
                type="password"
                required
                minLength={8}
                placeholder="Re-enter new password"
                value={cpForm.confirm}
                onChange={(e) => setCpForm(f => ({ ...f, confirm: e.target.value }))}
              />
            </div>

            <div style={{ marginTop: "0.5rem" }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={cpLoading}
                style={{ padding: "0.55rem 1.25rem" }}
              >
                {cpLoading ? "Updating Password…" : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
