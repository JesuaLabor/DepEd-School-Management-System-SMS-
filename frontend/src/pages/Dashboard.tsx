import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS, type AnalyticsOverview, type Announcement } from "@/types";
import { api } from "@/services/api";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const [res, annRes] = await Promise.all([
        api.analytics.overview(),
        api.announcements.list({ limit: 3 }).catch(() => ({ data: [] })),
      ]);
      setData(res);
      setAnnouncements(annRes.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load analytics dashboard";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const summary = data?.summary;
  const gradeLevels = data?.gradeLevelDistribution || [];
  const maxGradeCount = Math.max(...gradeLevels.map((g) => g.total), 1);

  const totalMale = summary?.totalMale ?? 0;
  const totalFemale = summary?.totalFemale ?? 0;
  const totalGender = totalMale + totalFemale || 1;
  const malePct = Math.round((totalMale / totalGender) * 100);
  const femalePct = 100 - malePct;

  const perf = data?.gradePerformance;
  const totalGraded = perf?.totalGrades ?? 0;

  return (
    <>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>👋 Welcome, {user?.firstName}!</span>
          </h1>
          <p style={{ marginTop: "0.25rem" }}>
            Signed in as <strong style={{ color: "var(--clr-accent)" }}>{user ? ROLE_LABELS[user.role] : ""}</strong>.
            Here is your real-time DepEd secondary school overview.
          </p>
        </div>

        {/* Quick Action Navigation */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link to="/attendance" className="btn btn-outline btn-sm">
            📅 Record Attendance
          </Link>
          <Link to="/grading" className="btn btn-outline btn-sm">
            📝 Grade Sheets
          </Link>
          <Link to="/school-forms" className="btn btn-outline btn-sm">
            📄 School Forms Hub
          </Link>
          {(user?.role === "super_admin" || user?.role === "registrar") && (
            <Link to="/enrollments" className="btn btn-primary btn-sm">
              + Process Enrollment
            </Link>
          )}
        </div>
      </div>

      <div className="page-body">
        {error && (
          <div className="card mb-6" style={{ borderLeft: "4px solid var(--clr-danger)", background: "rgba(239,68,68,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--clr-danger)", fontWeight: 500 }}>⚠️ {error}</span>
              <button className="btn btn-outline btn-sm" onClick={fetchAnalytics}>Retry</button>
            </div>
          </div>
        )}

        {/* ── Key Metrics Grid ─────────────────────────────────────────────── */}
        <div className="stats-grid mb-6">
          <div className="stat-card">
            <div className="stat-icon">👩‍🎓</div>
            <div className="stat-value" style={{ color: "#2563eb" }}>
              {loading ? "..." : summary?.totalStudents ?? 0}
            </div>
            <div className="stat-label">Total Learners</div>
            <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", marginTop: 4 }}>
              {loading ? "Loading..." : `${summary?.enrolledStudents ?? 0} Currently Enrolled`}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🏫</div>
            <div className="stat-value" style={{ color: "#0ea5e9" }}>
              {loading ? "..." : `${summary?.jhsCount ?? 0} / ${summary?.shsCount ?? 0}`}
            </div>
            <div className="stat-label">JHS / SHS Distribution</div>
            <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", marginTop: 4 }}>
              Grades 7–10 vs Grades 11–12
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-value" style={{ color: (summary?.attendanceRate ?? 100) >= 90 ? "var(--clr-success)" : "var(--clr-warning)" }}>
              {loading ? "..." : `${summary?.attendanceRate ?? 100}%`}
            </div>
            <div className="stat-label">School-Wide Attendance</div>
            <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", marginTop: 4 }}>
              Average Daily Attendance (ADA)
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⚠️</div>
            <div className="stat-value" style={{ color: (summary?.criticalSardoCount ?? 0) > 0 ? "var(--clr-danger)" : "var(--clr-success)" }}>
              {loading ? "..." : summary?.criticalSardoCount ?? 0}
            </div>
            <div className="stat-label">SARDO Critical Risks</div>
            <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", marginTop: 4 }}>
              {loading ? "..." : `${summary?.moderateRiskCount ?? 0} Moderate Warning(s)`}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">👨‍🏫</div>
            <div className="stat-value" style={{ color: "#6366f1" }}>
              {loading ? "..." : summary?.facultyCount ?? 0}
            </div>
            <div className="stat-label">Active Faculty & Staff</div>
            <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", marginTop: 4 }}>
              Teachers & Registrars
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📚</div>
            <div className="stat-value" style={{ color: "#10b981" }}>
              {loading ? "..." : summary?.sectionsCount ?? 0}
            </div>
            <div className="stat-label">Class Sections</div>
            <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", marginTop: 4 }}>
              JHS & SHS Advisories
            </div>
          </div>
        </div>

        {/* ── Main Analytics 2-Column Layout ───────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "1.25rem", marginBottom: "1.25rem" }}>
          
          {/* Card 1: Grade Level Enrollment Distribution */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="card-title">📊 Enrollment by Grade Level</span>
              <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>Grades 7–12</span>
            </div>
            <div style={{ padding: "0.5rem 0" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {gradeLevels.map((gl) => {
                  const pct = Math.round((gl.total / maxGradeCount) * 100);
                  const isSHS = gl.gradeLevel >= 11;
                  return (
                    <div key={gl.gradeLevel} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.825rem" }}>
                        <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          {gl.label}
                          {isSHS && <span className="badge badge-info" style={{ fontSize: "0.65rem", padding: "1px 5px" }}>SHS</span>}
                        </span>
                        <span style={{ color: "var(--clr-text-muted)" }}>
                          <strong style={{ color: "var(--clr-text)" }}>{gl.total}</strong> learners (♂ {gl.male} · ♀ {gl.female})
                        </span>
                      </div>
                      <div style={{ height: "10px", width: "100%", background: "var(--clr-surface-2)", borderRadius: "6px", overflow: "hidden", display: "flex" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${pct}%`,
                            background: isSHS
                              ? "linear-gradient(90deg, #6366f1, #8b5cf6)"
                              : "linear-gradient(90deg, #2563eb, #0ea5e9)",
                            borderRadius: "6px",
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card 2: Gender Demographics & SHS Strands */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">👥 Demographics & SHS Tracks</span>
            </div>
            
            {/* Gender Demographic Split */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                <span style={{ color: "#38bdf8", fontWeight: 600 }}>♂ Male: {totalMale} ({malePct}%)</span>
                <span style={{ color: "#f472b6", fontWeight: 600 }}>♀ Female: {totalFemale} ({femalePct}%)</span>
              </div>
              <div style={{ height: "14px", width: "100%", borderRadius: "8px", overflow: "hidden", display: "flex", background: "var(--clr-surface-2)" }}>
                <div style={{ width: `${malePct}%`, background: "#38bdf8", transition: "width 0.4s ease" }} title={`Male: ${malePct}%`} />
                <div style={{ width: `${femalePct}%`, background: "#f472b6", transition: "width 0.4s ease" }} title={`Female: ${femalePct}%`} />
              </div>
            </div>

            {/* SHS Track & Strand Breakdown */}
            <div style={{ borderTop: "1px solid var(--clr-border-soft)", paddingTop: "1rem" }}>
              <div style={{ fontSize: "0.825rem", fontWeight: 600, color: "var(--clr-text-muted)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Senior High Strands & Tracks
              </div>
              {data?.trackStrandDistribution && data.trackStrandDistribution.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {data.trackStrandDistribution.map((t) => (
                    <div key={t.strand} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.825rem" }}>
                      <div>
                        <span style={{ fontWeight: 600, textTransform: "uppercase" }}>{t.strand}</span>
                        <span style={{ color: "var(--clr-text-muted)", marginLeft: "0.4rem", fontSize: "0.75rem" }}>({t.track})</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span className="badge" style={{ background: "var(--clr-surface-2)", color: "var(--clr-text)" }}>
                          {t.count} students
                        </span>
                        <span style={{ color: "var(--clr-accent)", fontWeight: 600, minWidth: "38px", textAlign: "right" }}>
                          {t.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)", fontStyle: "italic" }}>
                  No Senior High learners currently registered under specialized strands.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Attendance Trend & Academic Performance ───────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "1.25rem", marginBottom: "1.25rem" }}>
          
          {/* Card 3: Recent Daily Attendance Trend */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="card-title">📅 Daily Attendance Trend</span>
              <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>Recent Recorded Days</span>
            </div>
            {data?.recentAttendanceTrend && data.recentAttendanceTrend.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {data.recentAttendanceTrend.map((day) => (
                  <div key={day.date} style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.825rem" }}>
                    <span style={{ width: "85px", fontFamily: "monospace", color: "var(--clr-text-muted)", flexShrink: 0 }}>
                      {day.date}
                    </span>
                    <div style={{ flex: 1, height: "10px", background: "var(--clr-surface-2)", borderRadius: "5px", overflow: "hidden", display: "flex" }}>
                      <div
                        style={{
                          width: `${day.attendanceRate}%`,
                          background: day.attendanceRate >= 90 ? "var(--clr-success)" : day.attendanceRate >= 80 ? "var(--clr-warning)" : "var(--clr-danger)",
                          borderRadius: "5px",
                        }}
                      />
                    </div>
                    <span style={{ fontWeight: 600, minWidth: "50px", textAlign: "right", color: day.attendanceRate >= 90 ? "var(--clr-success)" : "var(--clr-warning)" }}>
                      {day.attendanceRate}%
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", minWidth: "60px", textAlign: "right" }}>
                      ({day.present} / {day.total})
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "1.5rem 0", textAlign: "center", color: "var(--clr-text-muted)", fontSize: "0.85rem" }}>
                No attendance roll-calls recorded yet. Head over to the{" "}
                <Link to="/attendance">Attendance module</Link> to log daily sessions.
              </div>
            )}
          </div>

          {/* Card 4: Academic Performance Snapshot (DepEd Order No. 8, s. 2015) */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="card-title">🎯 Academic Performance (DO 8)</span>
              {perf && totalGraded > 0 && (
                <span className="badge badge-success" style={{ fontSize: "0.7rem" }}>
                  {perf.passingRate}% Passing Rate
                </span>
              )}
            </div>

            {totalGraded > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {[
                  { label: "Outstanding (90–100)",          count: perf?.outstanding ?? 0,        color: "#22c55e" },
                  { label: "Very Satisfactory (85–89)",      count: perf?.verySatisfactory ?? 0,    color: "#3b82f6" },
                  { label: "Satisfactory (80–84)",           count: perf?.satisfactory ?? 0,        color: "#0ea5e9" },
                  { label: "Fairly Satisfactory (75–79)",    count: perf?.fairlySatisfactory ?? 0,  color: "#f59e0b" },
                  { label: "Did Not Meet Expectations (<75)", count: perf?.didNotMeet ?? 0,          color: "#ef4444" },
                ].map((tier) => {
                  const pct = Math.round((tier.count / totalGraded) * 100);
                  return (
                    <div key={tier.label} style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                        <span style={{ color: tier.color, fontWeight: 600 }}>{tier.label}</span>
                        <span style={{ color: "var(--clr-text-muted)" }}>
                          <strong>{tier.count}</strong> ({pct}%)
                        </span>
                      </div>
                      <div style={{ height: "6px", width: "100%", background: "var(--clr-surface-2)", borderRadius: "4px", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, background: tier.color, height: "100%", borderRadius: "4px" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: "1.5rem 0", textAlign: "center", color: "var(--clr-text-muted)", fontSize: "0.85rem" }}>
                No quarterly grades computed yet. Access the{" "}
                <Link to="/grading">Grading module</Link> to encode quarterly ratings.
              </div>
            )}
          </div>
        </div>

        {/* ── Recent Announcements & Bulletins ────────────────────────────── */}
        <div className="card mb-6">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="card-title">📢 Recent Bulletins & Advisories</span>
            <Link to="/announcements" className="btn btn-outline btn-sm">
              View All Bulletins →
            </Link>
          </div>
          {announcements.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {announcements.map((a) => (
                <div
                  key={a.id}
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    background: "var(--clr-surface-2)",
                    borderLeft: a.isPinned
                      ? "3px solid var(--clr-primary)"
                      : a.priority === "urgent"
                      ? "3px solid var(--clr-danger)"
                      : a.priority === "advisory"
                      ? "3px solid var(--clr-warning)"
                      : "3px solid var(--clr-border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: "260px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
                      {a.isPinned && <span className="badge" style={{ fontSize: "0.65rem", background: "rgba(37,99,235,0.2)", color: "#60a5fa" }}>📌 Pinned</span>}
                      {a.priority === "urgent" && <span className="badge badge-danger" style={{ fontSize: "0.65rem" }}>Urgent</span>}
                      {a.priority === "advisory" && <span className="badge badge-warning" style={{ fontSize: "0.65rem" }}>Advisory</span>}
                      <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--clr-text)" }}>{a.title}</span>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {a.content}
                    </div>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", textAlign: "right" }}>
                    <div>{new Date(a.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                    <div style={{ marginTop: 2 }}>by {a.authorName}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: "0.75rem 0", color: "var(--clr-text-muted)", fontSize: "0.85rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>No bulletins posted yet.</span>
              <Link to="/announcements" className="btn btn-outline btn-sm">+ Post First Bulletin</Link>
            </div>
          )}
        </div>

        {/* ── SARDO Dropout Early Warning Card ─────────────────────────────── */}
        <div className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="card-title">⚠️ Dropout Prevention & SARDO Early Warning</span>
            <Link to="/attendance" className="btn btn-outline btn-sm">
              Full Attendance Report →
            </Link>
          </div>

          {data?.recentSardoRisks && data.recentSardoRisks.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Learner Name</th>
                    <th>LRN</th>
                    <th>Grade Level</th>
                    <th>Sex</th>
                    <th>Unexcused Absences</th>
                    <th>SARDO Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentSardoRisks.map((learner) => (
                    <tr key={learner.studentId}>
                      <td style={{ fontWeight: 600 }}>
                        {learner.lastName}, {learner.firstName}
                      </td>
                      <td style={{ fontFamily: "monospace" }}>{learner.lrn}</td>
                      <td>Grade {learner.gradeLevel}</td>
                      <td>{learner.sex || "—"}</td>
                      <td style={{ fontWeight: 700, color: learner.absences >= 10 ? "var(--clr-danger)" : "var(--clr-warning)" }}>
                        {learner.absences} days
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            learner.riskLevel.includes("Critical") ? "badge-danger" : "badge-warning"
                          }`}
                        >
                          {learner.riskLevel}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link to="/attendance" className="btn btn-outline btn-sm" style={{ padding: "2px 8px", fontSize: "0.75rem" }}>
                          Review Log
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "1rem 0", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(34,197,94,0.15)", color: "var(--clr-success)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>
                ✓
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>Attendance Health is Good</div>
                <div style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)" }}>
                  No learners currently meet the SARDO critical truancy threshold (≥ 5 unexcused absences).
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
