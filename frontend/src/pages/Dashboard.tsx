import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS } from "@/types";

const stats = [
  { label: "Total Students", value: "—", icon: "👩‍🎓", color: "#2563eb" },
  { label: "Active Teachers", value: "—", icon: "👩‍🏫", color: "#0ea5e9" },
  { label: "Sections",        value: "—", icon: "🏫",   color: "#6366f1" },
  { label: "Enrolled (SY)",   value: "—", icon: "📋",   color: "#22c55e" },
];

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <>
      <div className="page-header">
        <h1>👋 Welcome, {user?.firstName}!</h1>
        <p>
          You are signed in as <strong style={{ color: "var(--clr-accent)" }}>{user ? ROLE_LABELS[user.role] : ""}</strong>.
          Here is your school overview.
        </p>
      </div>
      <div className="page-body">
        <div className="stats-grid mb-6">
          {stats.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Getting Started</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[
              { step: "1", title: "Enroll students",        desc: "Add student records with LRN and guardian info.", done: false },
              { step: "2", title: "Create sections",        desc: "Assign students to sections and grade levels.",    done: false },
              { step: "3", title: "Encode grades",          desc: "Teachers enter quarterly grades per subject.",      done: false },
              { step: "4", title: "Generate School Forms",  desc: "Export SF9 report cards and SF10 permanent records.", done: false },
            ].map((item) => (
              <div key={item.step} style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: item.done ? "var(--clr-success)" : "var(--clr-surface-2)",
                  border: "1px solid var(--clr-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.75rem", fontWeight: 700, color: item.done ? "#fff" : "var(--clr-text-muted)",
                }}>
                  {item.done ? "✓" : item.step}
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: "0.875rem" }}>{item.title}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)", marginTop: 2 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
