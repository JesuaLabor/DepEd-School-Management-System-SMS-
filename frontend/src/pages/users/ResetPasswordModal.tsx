import { useState } from "react";
import { api } from "@/services/api";
import type { User } from "@/types";
import { ROLE_LABELS } from "@/types";

interface ResetPasswordModalProps {
  user: User;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ResetPasswordModal({ user, onClose, onSuccess }: ResetPasswordModalProps) {
  const [password, setPassword] = useState(() => generateTempPassword());
  const [showPassword, setShowPassword] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    newPassword: string;
    copied: boolean;
  } | null>(null);

  function generateTempPassword(): string {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let rand = "";
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `DepEd-${rand.toUpperCase()}-2026!`;
  }

  function handleRegenerate() {
    setPassword(generateTempPassword());
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.users.resetPassword(user.id, password);
      setSuccessResult({ newPassword: password, copied: false });
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopyCredentials() {
    const text =
      `DepEd SMS Portal Credentials\n` +
      `User: ${user.firstName} ${user.lastName}\n` +
      `Email: ${user.email}\n` +
      `Temporary Password: ${successResult?.newPassword || password}\n` +
      `Portal: ${window.location.origin}/login`;

    navigator.clipboard.writeText(text);
    if (successResult) {
      setSuccessResult(prev => prev ? { ...prev, copied: true } : null);
      setTimeout(() => {
        setSuccessResult(prev => prev ? { ...prev, copied: false } : null);
      }, 2500);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: "520px", width: "95%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
              Reset User Password
            </h2>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: "var(--clr-text-muted)" }}>
              Administrative password override for faculty and staff accounts.
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert alert-error mb-4">{error}</div>}

        {!successResult ? (
          <form onSubmit={handleReset}>
            {/* User identity card */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.85rem 1rem",
                borderRadius: "var(--radius)",
                background: "var(--clr-surface-2)",
                border: "1px solid var(--clr-border)",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--clr-primary), var(--clr-accent))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                }}
              >
                {user.firstName[0]}{user.lastName[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                  {user.firstName} {user.lastName}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--clr-text-muted)" }}>
                  {user.email}
                </div>
              </div>
              <span className="badge badge-primary" style={{ textTransform: "capitalize" }}>
                {ROLE_LABELS[user.role] || user.role}
              </span>
            </div>

            {/* Password input with generator */}
            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                <label className="form-label" style={{ margin: 0 }}>
                  New Temporary Password
                </label>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--clr-primary)",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    fontWeight: 600,
                    padding: 0,
                  }}
                >
                  ⚡ Generate Random
                </button>
              </div>

              <div style={{ position: "relative" }}>
                <input
                  className="form-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  style={{ fontFamily: "monospace", paddingRight: "4rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "0.5rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    color: "var(--clr-text-muted)",
                  }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "🙈 Hide" : "👁️ Show"}
                </button>
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", marginTop: "4px", display: "block" }}>
                Minimum 8 characters. Provide this password to the user to regain access.
              </span>
            </div>

            <div className="modal-footer" style={{ borderTop: "1px solid var(--clr-border)", paddingTop: "0.85rem" }}>
              <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading || password.length < 8}>
                {loading ? "Resetting Password…" : "Apply Password Reset →"}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div
              style={{
                textAlign: "center",
                padding: "1.25rem",
                borderRadius: "var(--radius)",
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                marginBottom: "1rem",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>✓</div>
              <h3 style={{ margin: "0 0 0.35rem 0", color: "#10b981", fontSize: "1.1rem" }}>
                Password Reset Successfully!
              </h3>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--clr-text-muted)" }}>
                The account password has been updated. Share the credentials below with the user.
              </p>
            </div>

            {/* Formatted Copy Snippet */}
            <div
              style={{
                background: "var(--clr-surface-2)",
                border: "1px solid var(--clr-border)",
                borderRadius: "var(--radius)",
                padding: "0.85rem 1rem",
                fontFamily: "monospace",
                fontSize: "0.8rem",
                lineHeight: "1.6",
                marginBottom: "1.25rem",
              }}
            >
              <div><strong>Account:</strong> {user.firstName} {user.lastName}</div>
              <div><strong>Email:</strong> {user.email}</div>
              <div><strong>New Password:</strong> <span style={{ color: "#2563eb", fontWeight: 700 }}>{successResult.newPassword}</span></div>
            </div>

            <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between" }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleCopyCredentials}
              >
                {successResult.copied ? "✓ Copied to Clipboard!" : "📋 Copy Credentials"}
              </button>
              <button type="button" className="btn btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
