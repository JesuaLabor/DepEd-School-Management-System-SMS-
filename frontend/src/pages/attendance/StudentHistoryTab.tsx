import { useState, useEffect, useRef } from "react";
import { api } from "@/services/api";
import type {
  Student,
  AttendanceRecord,
  AttendanceSummaryStats,
  AttendanceStatus,
} from "@/types";
import { ATTENDANCE_STATUS_LABELS } from "@/types";

interface Props {
  initialStudentId?: string | null;
}

export default function StudentHistoryTab({ initialStudentId }: Props) {
  // Student Picker
  const [query, setQuery]           = useState<string>("");
  const [results, setResults]       = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searching, setSearching]   = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const pickerRef                   = useRef<HTMLDivElement>(null);

  // Filters
  const [schoolYear, setSchoolYear] = useState<string>("2024-2025");
  const [dateFrom, setDateFrom]     = useState<string>("");
  const [dateTo, setDateTo]         = useState<string>("");

  // Data
  const [summary, setSummary]       = useState<AttendanceSummaryStats | null>(null);
  const [records, setRecords]       = useState<AttendanceRecord[]>([]);
  const [loading, setLoading]       = useState<boolean>(false);
  const [error, setError]           = useState<string | null>(null);

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editStatus, setEditStatus]       = useState<AttendanceStatus>("present");
  const [editRemarks, setEditRemarks]     = useState<string>("");
  const [updating, setUpdating]           = useState<boolean>(false);

  // Close picker on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced student search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.students.list({ search: query, limit: 8 });
        setResults(res.data);
        setShowResults(true);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // Load initial student if provided
  useEffect(() => {
    if (initialStudentId) {
      api.students
        .get(initialStudentId)
        .then((s) => {
          setSelectedStudent(s);
          setQuery(`${s.lastName}, ${s.firstName}`);
        })
        .catch(() => {});
    }
  }, [initialStudentId]);

  // Load student data when selectedStudent or filters change
  const loadStudentData = async (studentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, histRes] = await Promise.all([
        api.attendance.studentSummary(studentId, { schoolYear }),
        api.attendance.studentHistory(studentId, {
          schoolYear,
          dateFrom: dateFrom || undefined,
          dateTo:   dateTo || undefined,
        }),
      ]);
      setSummary(sumRes);
      setRecords(histRes.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load student history.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStudent) {
      loadStudentData(selectedStudent.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudent, schoolYear, dateFrom, dateTo]);

  // Select student handler
  const handleSelectStudent = (st: Student) => {
    setSelectedStudent(st);
    setQuery(`${st.lastName}, ${st.firstName}`);
    setShowResults(false);
  };

  // Open edit modal
  const openEdit = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    setEditStatus(rec.status);
    setEditRemarks(rec.remarks || "");
  };

  // Save edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setUpdating(true);
    try {
      await api.attendance.update(editingRecord.id, {
        status:  editStatus,
        remarks: editRemarks,
      });
      setEditingRecord(null);
      if (selectedStudent) loadStudentData(selectedStudent.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update record.";
      alert(message);
    } finally {
      setUpdating(false);
    }
  };

  // Delete record
  const handleDelete = async (recId: string) => {
    if (!confirm("Are you sure you want to remove this attendance record?")) return;
    try {
      await api.attendance.remove(recId);
      if (selectedStudent) loadStudentData(selectedStudent.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete record.";
      alert(message);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Student Selector & Filters ── */}
      <div className="card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1.5fr) repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", alignItems: "flex-end" }}>
          {/* Student Search Picker */}
          <div ref={pickerRef} className="student-picker">
            <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>Search Student (LRN or Name)</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="form-input"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (selectedStudent && e.target.value !== `${selectedStudent.lastName}, ${selectedStudent.firstName}`) {
                    setSelectedStudent(null);
                    setSummary(null);
                    setRecords([]);
                  }
                }}
                onFocus={() => { if (results.length > 0) setShowResults(true); }}
                placeholder="Type at least 2 characters..."
                style={{ width: "100%", paddingRight: "2rem" }}
              />
              {searching && (
                <div className="spinner" style={{ position: "absolute", right: "10px", top: "10px", width: "16px", height: "16px" }} />
              )}
            </div>

            {showResults && results.length > 0 && (
              <div className="student-picker-results">
                {results.map((st) => (
                  <div
                    key={st.id}
                    className="student-picker-item"
                    onClick={() => handleSelectStudent(st)}
                  >
                    <div>
                      <strong style={{ fontSize: "0.85rem" }}>{st.lastName}, {st.firstName} {st.middleName ? `${st.middleName[0]}.` : ""}</strong>
                      <div className="lrn">LRN: {st.lrn} · Grade {st.gradeLevel} {st.strand ? `(${st.strand.toUpperCase()})` : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
            <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>From Date</label>
            <input
              type="date"
              className="form-input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>To Date</label>
            <input
              type="date"
              className="form-input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </div>

      {/* ── Student Header Profile Card & Summary Stats ── */}
      {selectedStudent && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="card" style={{ padding: "1.25rem", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "var(--clr-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "#fff",
                }}
              >
                {selectedStudent.firstName[0]}{selectedStudent.lastName[0]}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
                  {selectedStudent.lastName}, {selectedStudent.firstName} {selectedStudent.middleName || ""}
                </h3>
                <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.8rem", color: "var(--clr-text-muted)", marginTop: "0.2rem" }}>
                  <span>LRN: <strong style={{ color: "var(--clr-text)" }}>{selectedStudent.lrn}</strong></span>
                  <span>•</span>
                  <span>Grade {selectedStudent.gradeLevel} {selectedStudent.strand ? `· Strand: ${selectedStudent.strand.toUpperCase()}` : ""}</span>
                  <span>•</span>
                  <span style={{ textTransform: "capitalize" }}>{selectedStudent.sex}</span>
                </div>
              </div>
            </div>

            {/* Truancy Risk Badge */}
            {summary && (
              <div>
                {summary.absent >= 10 ? (
                  <div className="risk-level-high" style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}>
                    ⚠️ SARDO Alert: Critical Truancy ({summary.absent} Absences)
                  </div>
                ) : summary.absent >= 5 ? (
                  <div className="risk-level-medium" style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}>
                    ⚠️ Moderate Truancy Risk ({summary.absent} Absences)
                  </div>
                ) : (
                  <div className="risk-level-low" style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}>
                    ✓ Good Standing ({summary.absent} Absences)
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stats Boxes */}
          {summary && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
              <div className="attendance-stat-box">
                <div className="count" style={{ color: "var(--clr-success)" }}>{summary.present}</div>
                <div>
                  <div className="label">Days Present</div>
                  <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>On time</span>
                </div>
              </div>

              <div className="attendance-stat-box">
                <div className="count" style={{ color: "var(--clr-warning)" }}>{summary.late}</div>
                <div>
                  <div className="label">Days Late</div>
                  <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>Tardiness</span>
                </div>
              </div>

              <div className="attendance-stat-box">
                <div className="count" style={{ color: "var(--clr-danger)" }}>{summary.absent}</div>
                <div>
                  <div className="label">Unexcused Absences</div>
                  <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>Days missed</span>
                </div>
              </div>

              <div className="attendance-stat-box">
                <div className="count" style={{ color: "var(--clr-info)" }}>{summary.excused}</div>
                <div>
                  <div className="label">Excused</div>
                  <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>With excuse slip</span>
                </div>
              </div>

              <div className="attendance-stat-box">
                <div className="count" style={{ color: "var(--clr-text)" }}>{summary.total}</div>
                <div>
                  <div className="label">Total School Days</div>
                  <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>Recorded</span>
                </div>
              </div>

              <div className="attendance-stat-box" style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.1), rgba(14,165,233,0.05))", borderColor: "rgba(37,99,235,0.3)" }}>
                <div className="count" style={{ color: "var(--clr-accent)" }}>
                  {summary.total > 0 ? (100 - summary.absenceRate).toFixed(1) : 0}%
                </div>
                <div>
                  <div className="label">Presence Rate</div>
                  <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>Overall punctuality</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Attendance Log History ── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--clr-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>Attendance History & Records</h4>
          {records.length > 0 && (
            <span style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)" }}>
              {records.length} records found
            </span>
          )}
        </div>

        {error && (
          <div className="alert alert-error" style={{ margin: "1rem" }}>
            <span>⚠️ {error}</span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--clr-text-muted)" }}>
            <div className="spinner" style={{ margin: "0 auto 1rem" }} />
            Loading attendance records...
          </div>
        ) : !selectedStudent ? (
          <div style={{ textAlign: "center", padding: "3.5rem 1rem", color: "var(--clr-text-muted)" }}>
            <p style={{ fontSize: "1.05rem", fontWeight: 500, marginBottom: "0.35rem" }}>
              Please select a student above to inspect their attendance history.
            </p>
            <p style={{ fontSize: "0.8rem" }}>
              Type an LRN or student name in the search field above.
            </p>
          </div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--clr-text-muted)" }}>
            <p style={{ fontSize: "1rem", fontWeight: 500, marginBottom: "0.25rem" }}>No attendance logs found for this filter period.</p>
            <p style={{ fontSize: "0.8rem" }}>Try expanding your date range or check another school year.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ width: "130px" }}>Date</th>
                  <th style={{ width: "110px" }}>Type</th>
                  <th style={{ minWidth: "140px" }}>Subject</th>
                  <th style={{ width: "130px" }}>Status</th>
                  <th>Remarks / Excuse Note</th>
                  <th style={{ width: "110px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => {
                  const d = new Date(rec.date);
                  const formattedDate = d.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    weekday: "short",
                  });

                  return (
                    <tr key={rec.id}>
                      <td style={{ fontWeight: 600, fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                        {formattedDate}
                      </td>

                      <td style={{ fontSize: "0.8rem", textTransform: "capitalize", color: "var(--clr-text-muted)" }}>
                        {rec.type}
                      </td>

                      <td style={{ fontSize: "0.85rem" }}>
                        {rec.subjectName || "—"}
                      </td>

                      <td>
                        <span className={`attendance-pill ${rec.status}`}>
                          {rec.status === "present" && "✓ "}
                          {rec.status === "late" && "⏱ "}
                          {rec.status === "absent" && "✗ "}
                          {rec.status === "excused" && "📋 "}
                          {ATTENDANCE_STATUS_LABELS[rec.status]}
                        </span>
                      </td>

                      <td style={{ fontSize: "0.82rem", color: rec.remarks ? "var(--clr-text)" : "var(--clr-text-muted)" }}>
                        {rec.remarks || "—"}
                      </td>

                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => openEdit(rec)}
                          title="Edit Status"
                          style={{ marginRight: "0.35rem", padding: "4px 8px", background: "none", border: "none", cursor: "pointer", color: "var(--clr-text-muted)" }}
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => handleDelete(rec.id)}
                          title="Delete Record"
                          style={{ padding: "4px 8px", background: "none", border: "none", cursor: "pointer", color: "var(--clr-danger)" }}
                        >
                          🗑
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

      {/* ── Edit Modal ── */}
      {editingRecord && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: "440px" }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Edit Attendance Record</h3>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                style={{ background: "none", border: "none", color: "var(--clr-text-muted)", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.25rem" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--clr-text-muted)" }}>
                Date: <strong style={{ color: "var(--clr-text)" }}>{new Date(editingRecord.date).toLocaleDateString()}</strong>
                {editingRecord.subjectName && ` · Subject: ${editingRecord.subjectName}`}
              </div>

              <div>
                <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>Status</label>
                <select
                  className="form-input"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as AttendanceStatus)}
                  style={{ width: "100%" }}
                >
                  <option value="present">Present</option>
                  <option value="late">Late / Tardy</option>
                  <option value="absent">Absent</option>
                  <option value="excused">Excused</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>Remarks / Notes</label>
                <textarea
                  className="form-input"
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="Reason for change, excuse notes, etc."
                  rows={3}
                  style={{ width: "100%", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingRecord(null)}
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updating}
                >
                  {updating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
