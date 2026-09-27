import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS } from "@/types";
import { api } from "@/services/api";

interface DashStats {
  total:       number;
  enrolled:    number;
  jhs:         number;
  shs:         number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashStats | null>(null);

  useEffect(() => {
    Promise.all([
      api.students.list({ limit: 1 }),
      api.students.list({ status: "enrolled", limit: 1 }),
      api.students.list({ gradeLevel: 7,  limit: 1 }),  // proxy for JHS: just count all, done below
      api.students.list({ gradeLevel: 11, limit: 1 }),
    ]).then(([all, enrolled]) => {
      // For JHS/SHS we do two more filtered calls
      return Promise.all([
        Promise.resolve(all.total),
        Promise.resolve(enrolled.total),
        api.students.list({ search: "", gradeLevel: undefined, status: "enrolled" }).then(r => {
          // approximate JHS vs SHS from the full enrolled list if total is small
          return r;
        }),
      ]);
    }).then(([total, enrolledTotal, allEnrolled]) => {
      const jhs = allEnrolled.data.filter(s => s.gradeLevel <= 10).length;
      const shs = allEnrolled.data.filter(s => s.gradeLevel >= 11).length;
      setStats({ total, enrolled: enrolledTotal, jhs, shs });
    }).catch(() => {});
  }, []);

  const statCards = [
    { label: "Total Students",    value: stats?.total    ?? "—", icon: "👩‍🎓", color: "#2563eb" },
    { label: "Currently Enrolled",value: stats?.enrolled ?? "—", icon: "📋",   color: "#22c55e" },
    { label: "JHS (Gr. 7–10)",    value: stats?.jhs      ?? "—", icon: "🏫",   color: "#0ea5e9" },
    { label: "SHS (Gr. 11–12)",   value: stats?.shs      ?? "—", icon: "🎓",   color: "#6366f1" },
  ];

  return (
    <>
      <div className="page-header">
        <h1>👋 Welcome, {user?.firstName}!</h1>
        <p>
          Signed in as <strong style={{ color: "var(--clr-accent)" }}>{user ? ROLE_LABELS[user.role] : ""}</strong>.
          Here is your school overview.
        </p>
      </div>

      <div className="page-body">
        <div className="stats-grid mb-6">
          {statCards.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">📌 Getting Started</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[
              { step: "1", title: "Enroll students",          desc: "Register learners with 12-digit LRN and process Grade 7-12 enrollment / promotion.", done: true },
              { step: "2", title: "Track daily attendance",   desc: "Record daily attendance and monitor SARDO truancy risks in the Attendance module.",   done: true },
              { step: "3", title: "Create sections",          desc: "Assign students to sections and grade levels (Section module — coming next).",       done: false },
              { step: "4", title: "Encode grades",            desc: "Teachers enter quarterly grades per subject (Grading module — coming next).",         done: false },
              { step: "5", title: "Generate School Forms",    desc: "Export SF2 daily attendance, SF9 report cards, and SF10 permanent records.",          done: false },
            ].map((item) => (
              <div key={item.step} style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: item.done ? "var(--clr-success)" : "var(--clr-surface-2)",
                  border: `1px solid ${item.done ? "var(--clr-success)" : "var(--clr-border)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.75rem", fontWeight: 700,
                  color: item.done ? "#fff" : "var(--clr-text-muted)",
                  transition: "all 0.2s ease",
                }}>
                  {item.done ? "✓" : item.step}
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {item.title}
                    {item.done && <span className="badge badge-success" style={{ fontSize: "0.65rem" }}>Done</span>}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)", marginTop: 3 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
