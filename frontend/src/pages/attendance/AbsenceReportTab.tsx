import { useState, useEffect } from "react";
import { api } from "@/services/api";
import type { AbsenceReportRow } from "@/types";

interface Props {
  onInspectStudent: (studentId: string) => void;
}

const GRADE_LEVELS = [7, 8, 9, 10, 11, 12];

export default function AbsenceReportTab({ onInspectStudent }: Props) {
  const [schoolYear, setSchoolYear] = useState<string>("2024-2025");
  const [gradeLevel, setGradeLevel] = useState<string>(""); // empty = all
  const [threshold, setThreshold]   = useState<number>(4);

  const [rows, setRows]             = useState<AbsenceReportRow[]>([]);
  const [loading, setLoading]       = useState<boolean>(false);
  const [error, setError]           = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.attendance.absenceReport({
        schoolYear,
        gradeLevel: gradeLevel ? Number(gradeLevel) : undefined,
        threshold,
      });
      setRows(res.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load absence report.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolYear, gradeLevel, threshold]);

  // Risk categorization
  const criticalCount = rows.filter((r) => r.absences >= 10).length;
  const moderateCount = rows.filter((r) => r.absences >= 5 && r.absences < 10).length;
  const warningCount  = rows.filter((r) => r.absences < 5).length;

  // Export to CSV
  const handleExportCSV = () => {
    if (rows.length === 0) return;

    const headers = ["Rank", "Student Name", "LRN", "Grade Level", "Absences", "Last Absent Date", "Risk Status"];
    const csvRows = rows.map((r, idx) => {
      const name = r.student ? `"${r.student.lastName}, ${r.student.firstName}"` : "Unknown";
      const lrn = r.student ? r.student.lrn : "";
      const lastDate = r.last_absent ? new Date(r.last_absent).toLocaleDateString() : "";
      const risk = r.absences >= 10 ? "Critical (SARDO)" : r.absences >= 5 ? "Moderate Risk" : "Warning";
      return [idx + 1, name, lrn, r.grade_level, r.absences, lastDate, `"${risk}"`].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `DepEd_SARDO_Absence_Report_${schoolYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── DepEd SARDO Policy Notice ── */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(245, 158, 11, 0.04))",
          borderColor: "rgba(239, 68, 68, 0.25)",
          padding: "1.25rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
          <div style={{ fontSize: "1.5rem" }}>📋</div>
          <div>
            <h4 style={{ margin: "0 0 0.35rem 0", color: "#f87171", fontSize: "0.95rem", fontWeight: 700 }}>
              DepEd Dropout Prevention & Early Warning System (SARDO)
            </h4>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--clr-text)", lineHeight: 1.5 }}>
              Under DepEd Guidelines, students accumulating frequent unexcused absences are classified as
              <strong> Students At Risk of Dropping Out (SARDO)</strong>. Reaching <strong>10 or more unexcused absences</strong> triggers
              mandatory parent-teacher conference, home visitation, and school guidance intervention.
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", alignItems: "flex-end" }}>
          <div>
            <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>School Year</label>
            <input
              type="text"
              className="form-input"
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              placeholder="e.g. 2024-2025"
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>Grade Level</label>
            <select
              className="form-input"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">All Grade Levels (7 - 12)</option>
              {GRADE_LEVELS.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>Minimum Absences Threshold</label>
            <select
              className="form-input"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              style={{ width: "100%" }}
            >
              <option value={2}>2+ Absences (Early Warning)</option>
              <option value={4}>4+ Absences (Default Threshold)</option>
              <option value={5}>5+ Absences (Moderate Risk)</option>
              <option value={10}>10+ Absences (Critical SARDO)</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportCSV}
              disabled={rows.length === 0}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary Counters ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        <div className="attendance-stat-box">
          <div className="count" style={{ color: "var(--clr-text)" }}>{rows.length}</div>
          <div>
            <div className="label">Total Flagged</div>
            <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>Meeting threshold</span>
          </div>
        </div>

        <div className="attendance-stat-box" style={{ background: "rgba(239, 68, 68, 0.08)", borderColor: "rgba(239, 68, 68, 0.25)" }}>
          <div className="count" style={{ color: "var(--clr-danger)" }}>{criticalCount}</div>
          <div>
            <div className="label">Critical SARDO</div>
            <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>10+ unexcused absences</span>
          </div>
        </div>

        <div className="attendance-stat-box" style={{ background: "rgba(245, 158, 11, 0.08)", borderColor: "rgba(245, 158, 11, 0.25)" }}>
          <div className="count" style={{ color: "var(--clr-warning)" }}>{moderateCount}</div>
          <div>
            <div className="label">Moderate Risk</div>
            <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>5 to 9 absences</span>
          </div>
        </div>

        <div className="attendance-stat-box">
          <div className="count" style={{ color: "var(--clr-info)" }}>{warningCount}</div>
          <div>
            <div className="label">Notice / Warning</div>
            <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>Below 5 absences</span>
          </div>
        </div>
      </div>

      {/* ── Report Table ── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--clr-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>Students with Chronic Absences</h4>
          <span style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)" }}>
            Showing top records sorted by absence frequency
          </span>
        </div>

        {error && (
          <div className="alert alert-error" style={{ margin: "1rem" }}>
            <span>⚠️ {error}</span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--clr-text-muted)" }}>
            <div className="spinner" style={{ margin: "0 auto 1rem" }} />
            Analyzing attendance records...
          </div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3.5rem 1rem", color: "var(--clr-text-muted)" }}>
            <p style={{ fontSize: "1.05rem", fontWeight: 500, marginBottom: "0.25rem", color: "var(--clr-success)" }}>
              ✓ Excellent! No students exceeded the absence threshold of {threshold}.
            </p>
            <p style={{ fontSize: "0.8rem" }}>
              Try lowering the threshold to 2 to see early warning trends.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ width: "60px", textAlign: "center" }}>Rank</th>
                  <th style={{ minWidth: "220px" }}>Student Name & Details</th>
                  <th style={{ width: "110px" }}>Grade Level</th>
                  <th style={{ width: "130px", textAlign: "center" }}>Total Absences</th>
                  <th style={{ minWidth: "150px" }}>Last Recorded Absence</th>
                  <th style={{ minWidth: "170px" }}>DepEd Risk Status</th>
                  <th style={{ width: "120px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const student = row.student;
                  const isCritical = row.absences >= 10;
                  const isModerate = row.absences >= 5 && row.absences < 10;

                  const lastDate = row.last_absent
                    ? new Date(row.last_absent).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—";

                  return (
                    <tr
                      key={row._id}
                      style={{
                        background: isCritical
                          ? "rgba(239, 68, 68, 0.04)"
                          : undefined,
                      }}
                    >
                      <td style={{ textAlign: "center", fontWeight: 700, color: idx < 3 ? "var(--clr-danger)" : "var(--clr-text-muted)" }}>
                        #{idx + 1}
                      </td>

                      <td>
                        {student ? (
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontWeight: 600, color: "var(--clr-text)" }}>
                              {student.lastName}, {student.firstName}
                            </span>
                            <span style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "var(--clr-text-muted)" }}>
                              LRN: {student.lrn}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: "var(--clr-text-muted)" }}>ID: {row._id}</span>
                        )}
                      </td>

                      <td>
                        <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                          Grade {row.grade_level}
                        </span>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.25rem 0.75rem",
                            borderRadius: "9999px",
                            fontWeight: 700,
                            fontSize: "0.9rem",
                            background: isCritical
                              ? "rgba(239, 68, 68, 0.2)"
                              : isModerate
                              ? "rgba(245, 158, 11, 0.2)"
                              : "rgba(99, 102, 241, 0.15)",
                            color: isCritical
                              ? "#f87171"
                              : isModerate
                              ? "#fbbf24"
                              : "#818cf8",
                            border: `1px solid ${
                              isCritical
                                ? "rgba(239, 68, 68, 0.4)"
                                : isModerate
                                ? "rgba(245, 158, 11, 0.4)"
                                : "rgba(99, 102, 241, 0.3)"
                            }`,
                          }}
                        >
                          {row.absences} days
                        </span>
                      </td>

                      <td style={{ fontSize: "0.85rem", color: "var(--clr-text-muted)" }}>
                        {lastDate}
                      </td>

                      <td>
                        {isCritical ? (
                          <span className="risk-level-high">
                            ⚠️ SARDO Alert (Dropout Risk)
                          </span>
                        ) : isModerate ? (
                          <span className="risk-level-medium">
                            ⚠️ Moderate Risk (Intervention)
                          </span>
                        ) : (
                          <span className="risk-level-low">
                            ● Caution / Warning
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => onInspectStudent(row._id)}
                          style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem" }}
                          title="View student timeline"
                        >
                          View Logs →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
