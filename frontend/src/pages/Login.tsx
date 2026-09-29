import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import DepEdSSOModal from "./auth/DepEdSSOModal";

export default function Login() {
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [error,        setError]        = useState<string | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [showSSOModal, setShowSSOModal] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token, user } = await api.auth.login(email, password);
      login(token, user);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* Left panel */}
      <div className="login-left">
        <div className="login-brand" style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <img
            src="/knhs_logo.png"
            alt="Kalilangan National High School Logo"
            style={{
              width: "48px",
              height: "48px",
              objectFit: "contain",
              borderRadius: "50%",
              background: "#ffffff",
              padding: "2px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              flexShrink: 0,
            }}
          />
          <div className="login-brand-text">
            <strong>Kalilangan National High School</strong>
            <span>DepEd School Management System</span>
          </div>
        </div>
        <div className="login-hero">
          <h1>Streamline your<br /><span>school administration</span></h1>
          <p>
            A centralized platform for managing student records, grades, attendance,
            and DepEd-compliant reports for JHS and SHS schools · Kalilangan, Bukidnon.
          </p>
          <div className="login-features">
            {[
              "Official DepEd Single Sign-On (@deped.gov.ph)",
              "Role-based access for all staff",
              "DepEd-compliant School Forms (SF1, SF9, SF10)",
              "Real-time grade & attendance tracking",
              "Works reliably with limited connectivity",
            ].map((f) => (
              <div key={f} className="login-feature">
                <div className="login-feature-dot" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="login-right">
        <div className="login-form-wrap">
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "1.25rem" }}>
            <img
              src="/knhs_logo.png"
              alt="KNHS Emblem"
              style={{
                width: "46px",
                height: "46px",
                objectFit: "contain",
                borderRadius: "50%",
                background: "#ffffff",
                padding: "2px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                flexShrink: 0,
              }}
            />
            <div>
              <h2 style={{ margin: 0, fontSize: "1.35rem" }}>Welcome back</h2>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--clr-text-muted)" }}>Kalilangan NHS Faculty & Learner Portal</p>
            </div>
          </div>

          {error && <div className="alert alert-error mb-4">{error}</div>}

          {/* DepEd Single Sign-On Button */}
          <button
            type="button"
            onClick={() => setShowSSOModal(true)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.65rem",
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius, 0.375rem)",
              border: "1px solid var(--clr-border, #cbd5e1)",
              background: "#ffffff",
              color: "#1e293b",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
          >
            {/* Google / DepEd multi-color icon */}
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Sign in with DepEd Account (@deped.gov.ph)</span>
          </button>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              margin: "1.25rem 0",
              color: "var(--clr-text-muted, #94a3b8)",
              fontSize: "0.75rem",
            }}
          >
            <div style={{ flex: 1, height: "1px", background: "var(--clr-border, #e2e8f0)" }} />
            <span style={{ padding: "0 0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              or sign in with password
            </span>
            <div style={{ flex: 1, height: "1px", background: "var(--clr-border, #e2e8f0)" }} />
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <input
                id="email" type="email" className="form-input"
                placeholder="you@school.edu.ph"
                value={email} onChange={(e) => setEmail(e.target.value)}
                required autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password" type="password" className="form-input"
                placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>

          <div style={{
            marginTop: "1.25rem",
            padding: "0.85rem",
            borderRadius: "0.5rem",
            background: "linear-gradient(135deg, rgba(30, 64, 175, 0.05), rgba(14, 165, 233, 0.05))",
            border: "1px solid rgba(30, 64, 175, 0.15)",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "0.825rem", fontWeight: 600, color: "var(--clr-primary, #1e40af)" }}>
              🎓 Incoming Student or Transferee?
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--clr-text-muted, #64748b)", margin: "0.25rem 0 0.6rem" }}>
              Submit an online enrollment application for JHS or SHS without an account.
            </p>
            <button
              type="button"
              onClick={() => navigate("/apply")}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                borderRadius: "0.375rem",
                background: "var(--clr-primary, #1e40af)",
                color: "#ffffff",
                fontSize: "0.8rem",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              Open Online Admission Portal →
            </button>
          </div>

          <div style={{ marginTop: "1rem", padding: "0.75rem", borderRadius: "0.375rem", background: "var(--bg-subtle, #f8fafc)", border: "1px dashed var(--border-color, #cbd5e1)", fontSize: "0.8125rem", color: "var(--text-muted, #64748b)" }}>
            <span style={{ fontWeight: 600, color: "var(--text-main, #1e293b)" }}>Default Admin Credentials:</span><br />
            Email: <code>admin@deped.gov.ph</code><br />
            Password: <code>AdminPass123!</code>
          </div>
        </div>
      </div>

      {showSSOModal && (
        <DepEdSSOModal onClose={() => setShowSSOModal(false)} />
      )}
    </div>
  );
}
