import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";
import type { DayOfWeek, PortalMyResponse, PortalStudentSummary, ScheduleSlot } from "@/types";

const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function LearnerPortalPage() {
  const { user } = useAuth();
  const [portalData, setPortalData] = useState<PortalMyResponse | null>(null);
  const [selectedChildIndex, setSelectedChildIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"grades" | "attendance" | "schedule" | "bulletins">("grades");
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isGuardian = user?.role === "guardian";

  const fetchPortal = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.portal.me();
      setPortalData(res);

      // Determine initial student ID to fetch schedule
      const initialStudent = isGuardian
        ? (res.children && res.children[0]?.student)
        : res.learner?.student;

      if (initialStudent?.id) {
        const schedRes = await api.portal.studentSchedule(initialStudent.id).catch(() => ({ slots: [] }));
        setScheduleSlots(schedRes.slots || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load learner portal.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChild = async (idx: number) => {
    setSelectedChildIndex(idx);
    const child = portalData?.children?.[idx]?.student;
    if (child?.id) {
      try {
        const schedRes = await api.portal.studentSchedule(child.id);
        setScheduleSlots(schedRes.slots || []);
      } catch {
        setScheduleSlots([]);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--clr-text-muted)" }}>
        <div className="spinner" style={{ margin: "0 auto 1rem auto" }} />
        Loading your academic records...
      </div>
    );
  }

  // Active student summary
  const currentSummary: PortalStudentSummary | undefined = isGuardian
    ? portalData?.children?.[selectedChildIndex]
    : portalData?.learner;

  if (error || !currentSummary) {
    return (
      <div className="card" style={{ maxWidth: "600px", margin: "2rem auto", padding: "2.5rem 2rem", textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🎓</div>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
          {isGuardian ? "No Linked Children Found" : "Learner Record Not Linked"}
        </h2>
        <p style={{ color: "var(--clr-text-muted)", fontSize: "0.875rem", lineHeight: 1.5, marginBottom: "1.5rem" }}>
          {isGuardian
            ? "Your parent/guardian account is not yet linked to any student profile. Please contact the school registrar to associate your account with your child's 12-digit LRN."
            : "Your student user account is not yet linked to a DepEd Learner Reference Number (LRN). Please contact your class adviser or the school registrar."}
        </p>
        <Link to="/" className="btn btn-primary">
          Back to Overview
        </Link>
      </div>
    );
  }

  const { student, section, attendance, grades, generalAverage, descriptor } = currentSummary;

  // Group schedule slots by Day
  const slotsByDay: Record<DayOfWeek, ScheduleSlot[]> = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
  };
  scheduleSlots.forEach((s) => {
    if (slotsByDay[s.dayOfWeek]) {
      slotsByDay[s.dayOfWeek].push(s);
    }
  });
  DAYS.forEach((d) => {
    slotsByDay[d].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  return (
    <>
      {/* ── Guardian Children Selector ─────────────────────────────────────── */}
      {isGuardian && portalData?.children && portalData.children.length > 1 && (
        <div className="card mb-6" style={{ padding: "0.85rem 1.25rem" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--clr-text-muted)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            Select Child / Student:
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {portalData.children.map((child, idx) => (
              <button
                key={child.student.id}
                className={`btn btn-sm ${selectedChildIndex === idx ? "btn-primary" : "btn-outline"}`}
                onClick={() => handleSelectChild(idx)}
              >
                👧 {child.student.firstName} {child.student.lastName} (Grade {child.student.gradeLevel})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Learner Profile Banner ────────────────────────────────────────── */}
      <div
        className="card mb-6"
        style={{
          background: "linear-gradient(135deg, var(--clr-surface) 0%, rgba(37,99,235,0.08) 100%)",
          borderLeft: "4px solid var(--clr-accent)",
          padding: "1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, var(--clr-primary), var(--clr-accent))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                color: "#fff",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {student.firstName[0]}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.2rem" }}>
                <img
                  src="/knhs_logo.png"
                  alt="KNHS"
                  style={{ width: "20px", height: "20px", objectFit: "contain" }}
                />
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--clr-accent)", fontWeight: 700 }}>
                  Kalilangan National High School
                </span>
              </div>
              <h1 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0 }}>
                {student.lastName}, {student.firstName} {student.middleName || ""} {student.extName || ""}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.35rem", fontSize: "0.85rem", color: "var(--clr-text-muted)" }}>
                <span>LRN: <strong style={{ color: "var(--clr-text)", fontFamily: "monospace" }}>{student.lrn}</strong></span>
                <span>·</span>
                <span>Grade {student.gradeLevel}</span>
                {student.strand && <span className="badge badge-info" style={{ fontSize: "0.7rem" }}>{student.strand.toUpperCase()}</span>}
                <span>·</span>
                <span>Section: <strong style={{ color: "var(--clr-text)" }}>{section?.name || "Unassigned"}</strong></span>
                {section?.adviser && (
                  <>
                    <span>·</span>
                    <span>Adviser: <strong>{section.adviser.lastName}, {section.adviser.firstName}</strong></span>
                    <Link
                      to={`/messages?to=${section.adviser.id}&subject=${encodeURIComponent(`Academic Consultation - ${student.firstName} ${student.lastName} (LRN: ${student.lrn})`)}`}
                      className="btn btn-sm btn-outline"
                      style={{ padding: "0.2rem 0.6rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.3rem", marginLeft: "0.4rem" }}
                      title="Direct message class adviser"
                    >
                      ✉ Message Adviser
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Academic Standing Badge */}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
              General Average
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, color: (generalAverage ?? 0) >= 75 ? "var(--clr-success)" : "var(--clr-warning)" }}>
              {generalAverage ? generalAverage.toFixed(2) : "—"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>
              {descriptor || "Ratings in Progress"}
            </div>
          </div>
        </div>
      </div>

      {/* ── Portal Navigation Tabs ────────────────────────────────────────── */}
      <div className="no-print" style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--clr-border)", paddingBottom: "0.5rem", marginBottom: "1.25rem" }}>
        <button
          className={`btn btn-sm ${activeTab === "grades" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setActiveTab("grades")}
        >
          📄 Report Card (SF9)
        </button>
        <button
          className={`btn btn-sm ${activeTab === "attendance" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setActiveTab("attendance")}
        >
          📅 Attendance Record
        </button>
        <button
          className={`btn btn-sm ${activeTab === "schedule" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setActiveTab("schedule")}
        >
          🗓️ Class Timetable
        </button>
      </div>

      {/* ── TAB 1: Report Card (SF9) ──────────────────────────────────────── */}
      {activeTab === "grades" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--clr-border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
                DepEd School Form 9 (SF9) Learner's Progress Report
              </h3>
              <span style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)" }}>
                Quarterly ratings, transmuted grades, and verbal descriptors (DO 8, s. 2015)
              </span>
            </div>

            <button className="btn btn-outline btn-sm no-print" onClick={() => window.print()}>
              🖨️ Print SF9 Card
            </button>
          </div>

          {grades.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--clr-text-muted)" }}>
              No grades encoded for this school year yet.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Learning Area / Subject</th>
                    <th style={{ textAlign: "center" }}>Q1</th>
                    <th style={{ textAlign: "center" }}>Q2</th>
                    <th style={{ textAlign: "center" }}>Q3</th>
                    <th style={{ textAlign: "center" }}>Q4</th>
                    <th style={{ textAlign: "center" }}>Final Rating</th>
                    <th style={{ textAlign: "center" }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((g) => (
                    <tr key={g.id}>
                      <td style={{ fontWeight: 600 }}>{g.subjectName}</td>
                      <td style={{ textAlign: "center", fontFamily: "monospace" }}>{g.q1 ?? "—"}</td>
                      <td style={{ textAlign: "center", fontFamily: "monospace" }}>{g.q2 ?? "—"}</td>
                      <td style={{ textAlign: "center", fontFamily: "monospace" }}>{g.q3 ?? "—"}</td>
                      <td style={{ textAlign: "center", fontFamily: "monospace" }}>{g.q4 ?? "—"}</td>
                      <td style={{ textAlign: "center", fontWeight: 700, color: (g.finalGrade ?? 0) >= 75 ? "var(--clr-text)" : "var(--clr-danger)" }}>
                        {g.finalGrade ? g.finalGrade.toFixed(0) : "—"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {g.remarks ? (
                          <span className={`badge ${g.remarks === "Passed" ? "badge-success" : "badge-danger"}`}>
                            {g.remarks}
                          </span>
                        ) : (
                          <span style={{ color: "var(--clr-text-muted)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {generalAverage && (
                    <tr style={{ background: "var(--clr-surface-2)", fontWeight: 800 }}>
                      <td>GENERAL AVERAGE</td>
                      <td colSpan={4} style={{ textAlign: "right", color: "var(--clr-text-muted)", fontSize: "0.85rem" }}>
                        {descriptor}
                      </td>
                      <td style={{ textAlign: "center", fontSize: "1.05rem", color: generalAverage >= 75 ? "var(--clr-success)" : "var(--clr-danger)" }}>
                        {generalAverage.toFixed(2)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className={`badge ${generalAverage >= 75 ? "badge-success" : "badge-danger"}`}>
                          {generalAverage >= 75 ? "PASSED" : "FAILED"}
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Attendance Record ──────────────────────────────────────── */}
      {activeTab === "attendance" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📅</div>
              <div className="stat-value" style={{ color: "var(--clr-primary)" }}>{attendance.total}</div>
              <div className="stat-label">Total School Days Tracked</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-value" style={{ color: "var(--clr-success)" }}>{attendance.present}</div>
              <div className="stat-label">Days Present</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">⚠️</div>
              <div className="stat-value" style={{ color: attendance.absent >= 5 ? "var(--clr-danger)" : "var(--clr-text)" }}>
                {attendance.absent}
              </div>
              <div className="stat-label">Days Absent</div>
              {attendance.absent >= 10 ? (
                <span className="badge badge-danger" style={{ marginTop: "4px", fontSize: "0.65rem" }}>Critical SARDO</span>
              ) : attendance.absent >= 5 ? (
                <span className="badge badge-warning" style={{ marginTop: "4px", fontSize: "0.65rem" }}>Moderate Risk</span>
              ) : null}
            </div>

            <div className="stat-card">
              <div className="stat-icon">⏰</div>
              <div className="stat-value" style={{ color: "var(--clr-warning)" }}>{attendance.late}</div>
              <div className="stat-label">Times Tardy / Late</div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: Class Timetable ───────────────────────────────────────── */}
      {activeTab === "schedule" && (
        <div className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="card-title">🗓️ Weekly Class Timetable</span>
            <button className="btn btn-outline btn-sm no-print" onClick={() => window.print()}>
              🖨️ Print Timetable
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              marginTop: "1rem",
            }}
          >
            {DAYS.map((day) => {
              const daySlots = slotsByDay[day];
              return (
                <div
                  key={day}
                  style={{
                    padding: "0.85rem",
                    background: "var(--clr-surface-2)",
                    borderRadius: "8px",
                    borderTop: "3px solid var(--clr-primary)",
                    minHeight: "220px",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.6rem", color: "var(--clr-text)" }}>
                    {day}
                  </div>
                  {daySlots.length === 0 ? (
                    <div style={{ color: "var(--clr-text-muted)", fontSize: "0.75rem", fontStyle: "italic", textAlign: "center", padding: "1.5rem 0" }}>
                      No classes
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {daySlots.map((s) => (
                        <div
                          key={s.id}
                          style={{
                            padding: "0.5rem 0.65rem",
                            borderRadius: "6px",
                            background: "var(--clr-surface)",
                            borderLeft: "3px solid var(--clr-accent)",
                          }}
                        >
                          <div style={{ fontSize: "0.725rem", color: "var(--clr-accent)", fontWeight: 700, fontFamily: "monospace" }}>
                            {s.startTime} - {s.endTime}
                          </div>
                          <div style={{ fontWeight: 600, fontSize: "0.825rem", marginTop: 2 }}>{s.subjectName}</div>
                          <div style={{ fontSize: "0.725rem", color: "var(--clr-text-muted)", marginTop: 2 }}>
                            👨‍🏫 {s.teacherName} {s.room ? `· 📍 ${s.room}` : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
