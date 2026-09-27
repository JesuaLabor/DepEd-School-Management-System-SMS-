import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
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
        <div className="login-brand">
          <div className="login-brand-icon">D</div>
          <div className="login-brand-text">
            <strong>DepEd SMS</strong>
            <span>School Management System</span>
          </div>
        </div>
        <div className="login-hero">
          <h1>Streamline your<br /><span>school administration</span></h1>
          <p>
            A centralized platform for managing student records, grades, attendance,
            and DepEd-compliant reports for JHS and SHS schools.
          </p>
          <div className="login-features">
            {[
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
          <h2>Welcome back</h2>
          <p>Sign in to your account to continue</p>

          {error && <div className="alert alert-error mb-4">{error}</div>}

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

          <div style={{ marginTop: "1.25rem", padding: "0.75rem", borderRadius: "0.375rem", background: "var(--bg-subtle, #f8fafc)", border: "1px dashed var(--border-color, #cbd5e1)", fontSize: "0.8125rem", color: "var(--text-muted, #64748b)" }}>
            <span style={{ fontWeight: 600, color: "var(--text-main, #1e293b)" }}>Default Admin Credentials:</span><br />
            Email: <code>admin@deped.gov.ph</code><br />
            Password: <code>AdminPass123!</code>
          </div>
        </div>
      </div>
    </div>
  );
}
