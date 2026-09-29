import { useState } from "react";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

interface DepEdSSOModalProps {
  onClose: () => void;
}

interface DemoAccount {
  email: string;
  name: string;
  designation: string;
  role: string;
}

const DEMO_DEPED_ACCOUNTS: DemoAccount[] = [
  {
    email: "maria.santos@deped.gov.ph",
    name: "Maria Santos",
    designation: "Secondary School Teacher III (Grade 10)",
    role: "Teacher",
  },
  {
    email: "juan.delacruz@deped.gov.ph",
    name: "Juan Dela Cruz",
    designation: "Master Teacher I (Grade 7 Adviser)",
    role: "Teacher",
  },
  {
    email: "clara.reyes@deped.gov.ph",
    name: "Clara Reyes",
    designation: "Senior High School Registrar Officer",
    role: "Registrar",
  },
  {
    email: "admin@deped.gov.ph",
    name: "Principal Admin",
    designation: "School Head / ICT Coordinator",
    role: "Super Admin",
  },
];

export default function DepEdSSOModal({ onClose }: DepEdSSOModalProps) {
  const [activeTab, setActiveTab] = useState<"quick" | "custom">("quick");
  const [customEmail, setCustomEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleAuthenticate(emailToAuth: string, fName?: string, lName?: string) {
    setError(null);
    setLoading(true);

    const cleanEmail = emailToAuth.trim().toLowerCase();
    if (!cleanEmail.endsWith("@deped.gov.ph") && !cleanEmail.includes(".deped.gov.ph") && cleanEmail !== "admin@deped.gov.ph") {
      setError("Only official DepEd domain accounts (*@deped.gov.ph) are permitted.");
      setLoading(false);
      return;
    }

    try {
      const resp = await api.auth.depedSSO({
        email: cleanEmail,
        firstName: fName || undefined,
        lastName: lName || undefined,
        provider: "deped_google",
      });

      login(resp.token, resp.user);
      onClose();
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customEmail) return;

    let fullEmail = customEmail.trim().toLowerCase();
    if (!fullEmail.includes("@")) {
      fullEmail = `${fullEmail}@deped.gov.ph`;
    }

    handleAuthenticate(fullEmail, firstName, lastName);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: "560px", width: "95%" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with DepEd Branding */}
        <div className="modal-header" style={{ borderBottom: "1px solid var(--clr-border, #e2e8f0)", paddingBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #1e3a8a, #0284c7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "1rem",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              D
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
                DepEd Single Sign-On
              </h2>
              <div style={{ fontSize: "0.8rem", color: "var(--clr-text-muted, #64748b)" }}>
                Official Google Workspace for Education (@deped.gov.ph)
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert alert-error mb-4 mt-3">{error}</div>}

        {/* Tab switch */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--clr-border, #e2e8f0)",
            margin: "1rem 0",
            gap: "0.5rem",
          }}
        >
          <button
            type="button"
            onClick={() => { setActiveTab("quick"); setError(null); }}
            style={{
              padding: "0.5rem 1rem",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "quick" ? "2px solid var(--clr-accent, #f59e0b)" : "2px solid transparent",
              color: activeTab === "quick" ? "var(--clr-accent-light, #fbbf24)" : "var(--clr-text-muted, #8fa3bf)",
              fontWeight: activeTab === "quick" ? 700 : 500,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Quick Select Account
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("custom"); setError(null); }}
            style={{
              padding: "0.5rem 1rem",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "custom" ? "2px solid var(--clr-accent, #f59e0b)" : "2px solid transparent",
              color: activeTab === "custom" ? "var(--clr-accent-light, #fbbf24)" : "var(--clr-text-muted, #8fa3bf)",
              fontWeight: activeTab === "custom" ? 700 : 500,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Enter DepEd Email
          </button>
        </div>

        {/* TAB 1: Quick Select Account */}
        {activeTab === "quick" && (
          <div>
            <p style={{ fontSize: "0.82rem", color: "var(--clr-text-muted, #8fa3bf)", marginBottom: "1rem" }}>
              Select a faculty or staff account below. New accounts are automatically provisioned with DepEd teacher privileges.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {DEMO_DEPED_ACCOUNTS.map((acc) => (
                <div
                  key={acc.email}
                  onClick={() => !loading && handleAuthenticate(acc.email, acc.name.split(" ")[0], acc.name.split(" ")[1])}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.5rem",
                    border: "1px solid var(--clr-border, #22334d)",
                    background: "var(--clr-surface-2, #172338)",
                    cursor: loading ? "not-allowed" : "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--clr-accent, #f59e0b)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--clr-border, #22334d)")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: "rgba(30, 64, 175, 0.25)",
                        color: "#93c5fd",
                        border: "1px solid rgba(59, 130, 246, 0.35)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                      }}
                    >
                      {acc.name[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{acc.name}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--clr-accent-light, #fbbf24)", fontFamily: "monospace" }}>
                        {acc.email}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--clr-text-muted, #8fa3bf)" }}>
                        {acc.designation}
                      </div>
                    </div>
                  </div>

                  <span
                    className="badge badge-primary"
                    style={{ fontSize: "0.7rem", padding: "2px 8px" }}
                  >
                    {acc.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: Custom DepEd Email */}
        {activeTab === "custom" && (
          <form onSubmit={handleCustomSubmit}>
            <p style={{ fontSize: "0.82rem", color: "var(--clr-text-muted, #64748b)", marginBottom: "1rem" }}>
              Enter your official DepEd email address. If this is your first time logging in, an account will be created automatically.
            </p>

            <div className="form-group" style={{ marginBottom: "0.75rem" }}>
              <label className="form-label">Official DepEd Email</label>
              <div style={{ display: "flex", alignItems: "center" }}>
                <input
                  className="form-input"
                  type="text"
                  placeholder="first.last@deped.gov.ph"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted, #64748b)", marginTop: "2px", display: "block" }}>
                Must be an active <code>@deped.gov.ph</code> or division account.
              </span>
            </div>

            <div className="grid-2" style={{ gap: "0.75rem", marginBottom: "1rem" }}>
              <div className="form-group">
                <label className="form-label">First Name (Optional)</label>
                <input
                  className="form-input"
                  placeholder="e.g. Maria"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name (Optional)</label>
                <input
                  className="form-input"
                  placeholder="e.g. Santos"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%" }}
              disabled={loading || !customEmail}
            >
              {loading ? "Authenticating via SSO…" : "Authenticate with DepEd SSO →"}
            </button>
          </form>
        )}

        <div className="modal-footer" style={{ marginTop: "1.25rem", borderTop: "1px solid var(--clr-border, #e2e8f0)", paddingTop: "0.75rem" }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
