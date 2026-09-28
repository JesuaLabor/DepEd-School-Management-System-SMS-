import { useState, useEffect, useMemo } from "react";
import { api } from "@/services/api";
import { enqueueMutation } from "@/services/offlineQueue";
import type { AttendanceStatus, AttendanceType, StudentSummary } from "@/types";

const GRADE_LEVELS = [7, 8, 9, 10, 11, 12];
const TODAY = new Date().toISOString().split("T")[0];

interface StudentRowState {
  status:   AttendanceStatus | null;
  remarks:  string;
  originalStatus: AttendanceStatus | null;
  originalRemarks: string;
}

export default function DailyAttendanceTab() {
  const [date, setDate]             = useState<string>(TODAY);
  const [gradeLevel, setGradeLevel] = useState<number>(7);
  const [schoolYear, setSchoolYear] = useState<string>("2024-2025");
  const [type, setType]             = useState<AttendanceType>("daily");
  const [subjectName, setSubjectName] = useState<string>("");

  const [students, setStudents]     = useState<StudentSummary[]>([]);
  const [rows, setRows]             = useState<Record<string, StudentRowState>>({});
  const [searchFilter, setSearchFilter] = useState<string>("");

  const [loading, setLoading]       = useState<boolean>(false);
  const [saving, setSaving]         = useState<boolean>(false);
  const [error, setError]           = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch report whenever filters change
  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.attendance.dailyReport({
        date,
        gradeLevel,
        schoolYear,
        type,
      });

      setStudents(res.students || []);

      const initialRows: Record<string, StudentRowState> = {};
      (res.students || []).forEach((st) => {
        const existing = res.records?.[st.id];
        initialRows[st.id] = {
          status:          existing ? existing.status : null,
          remarks:         existing?.remarks || "",
          originalStatus:  existing ? existing.status : null,
          originalRemarks: existing?.remarks || "",
        };
      });
      setRows(initialRows);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load attendance sheet.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, gradeLevel, schoolYear, type]);

  // Handle status toggle for a student
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setRows((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { remarks: "", originalStatus: null, originalRemarks: "" }),
        status: prev[studentId]?.status === status ? null : status,
      },
    }));
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setRows((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { status: null, originalStatus: null, originalRemarks: "" }),
        remarks,
      },
    }));
  };

  // Bulk actions
  const markAll = (status: AttendanceStatus) => {
    setRows((prev) => {
      const updated = { ...prev };
      students.forEach((st) => {
        updated[st.id] = {
          ...(updated[st.id] || { remarks: "", originalStatus: null, originalRemarks: "" }),
          status,
        };
      });
      return updated;
    });
  };

  const clearAll = () => {
    setRows((prev) => {
      const updated = { ...prev };
      students.forEach((st) => {
        updated[st.id] = {
          ...(updated[st.id] || { remarks: "", originalStatus: null, originalRemarks: "" }),
          status: null,
          remarks: "",
        };
      });
      return updated;
    });
  };

  // Calculated summary statistics
  const summary = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    let excused = 0;
    let unrecorded = 0;

    students.forEach((st) => {
      const row = rows[st.id];
      if (!row || !row.status) {
        unrecorded++;
      } else if (row.status === "present") present++;
      else if (row.status === "late") late++;
      else if (row.status === "absent") absent++;
      else if (row.status === "excused") excused++;
    });

    const recorded = present + late + absent + excused;
    const rate = recorded > 0 ? Math.round(((present + late) / recorded) * 100) : 0;

    return { present, late, absent, excused, unrecorded, recorded, rate, total: students.length };
  }, [students, rows]);

  // Unsaved changes check
  const hasChanges = useMemo(() => {
    return students.some((st) => {
      const row = rows[st.id];
      if (!row) return false;
      return row.status !== row.originalStatus || row.remarks !== row.originalRemarks;
    });
  }, [students, rows]);

  // Save changes
  const handleSave = async () => {
    setError(null);
    setSuccessMsg(null);

    const recordsToSave = students
      .filter((st) => rows[st.id]?.status)
      .map((st) => ({
        studentId: st.id,
        status:    rows[st.id].status!,
        remarks:   rows[st.id].remarks || "",
      }));

    if (recordsToSave.length === 0) {
      setError("No attendance records marked to save.");
      return;
    }

    if (type === "subject" && !subjectName.trim()) {
      setError("Please specify a subject name when recording subject attendance.");
      return;
    }

    setSaving(true);
    const payload = {
      date,
      gradeLevel,
      schoolYear,
      type,
      subjectName: type === "subject" ? subjectName.trim() : undefined,
      records: recordsToSave,
    };

    if (!navigator.onLine) {
      enqueueMutation({
        endpoint: "/attendance/batch",
        method: "POST",
        body: payload,
        title: `Attendance Gr.${gradeLevel} (${date})`,
      });
      setSuccessMsg(`Offline Mode: Saved ${recordsToSave.length} attendance records locally. Will auto-sync when reconnected.`);
      setRows((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((id) => {
          updated[id] = {
            ...updated[id],
            originalStatus: updated[id].status,
            originalRemarks: updated[id].remarks,
          };
        });
        return updated;
      });
      setSaving(false);
      return;
    }

    try {
      const res = await api.attendance.batchRecord(payload);

      setSuccessMsg(`Attendance saved successfully! (${res.upserted + res.modified} students recorded)`);
      // Refresh to sync originals
      fetchReport();
    } catch (err: unknown) {
      enqueueMutation({
        endpoint: "/attendance/batch",
        method: "POST",
        body: payload,
        title: `Attendance Gr.${gradeLevel} (${date})`,
      });
      setSuccessMsg(`Network issue encountered. Saved ${recordsToSave.length} attendance records to offline queue. Will auto-sync.`);
    } finally {
      setSaving(false);
    }
  };

  // Filter students based on local search
  const filteredStudents = useMemo(() => {
    if (!searchFilter.trim()) return students;
    const q = searchFilter.toLowerCase();
    return students.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.lrn.includes(q)
    );
  }, [students, searchFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Control Bar ── */}
      <div className="card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", alignItems: "flex-end" }}>
          <div>
            <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>Attendance Date</label>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>Grade Level</label>
            <select
              className="form-input"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(Number(e.target.value))}
              style={{ width: "100%" }}
            >
              {GRADE_LEVELS.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
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
            <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>Attendance Mode</label>
            <select
              className="form-input"
              value={type}
              onChange={(e) => setType(e.target.value as AttendanceType)}
              style={{ width: "100%" }}
            >
              <option value="daily">Daily Attendance</option>
              <option value="subject">Subject-Based</option>
            </select>
          </div>

          {type === "subject" && (
            <div>
              <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>Subject Name</label>
              <input
                type="text"
                className="form-input"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="e.g. Mathematics"
                style={{ width: "100%" }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Summary & Quick Actions ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "stretch" }}>
        <div className="attendance-stat-box">
          <div className="count" style={{ color: "var(--clr-success)" }}>{summary.present}</div>
          <div>
            <div className="label">Present</div>
            <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>On time</span>
          </div>
        </div>

        <div className="attendance-stat-box">
          <div className="count" style={{ color: "var(--clr-warning)" }}>{summary.late}</div>
          <div>
            <div className="label">Late / Tardy</div>
            <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>Arrived late</span>
          </div>
        </div>

        <div className="attendance-stat-box">
          <div className="count" style={{ color: "var(--clr-danger)" }}>{summary.absent}</div>
          <div>
            <div className="label">Absent</div>
            <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>Unexcused</span>
          </div>
        </div>

        <div className="attendance-stat-box">
          <div className="count" style={{ color: "var(--clr-info)" }}>{summary.excused}</div>
          <div>
            <div className="label">Excused</div>
            <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>With notice</span>
          </div>
        </div>

        <div className="attendance-stat-box">
          <div className="count" style={{ color: "var(--clr-text-muted)" }}>{summary.unrecorded}</div>
          <div>
            <div className="label">Unmarked</div>
            <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>Pending</span>
          </div>
        </div>

        <div className="attendance-stat-box" style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.1), rgba(14,165,233,0.05))", borderColor: "rgba(37,99,235,0.3)" }}>
          <div className="count" style={{ color: "var(--clr-accent)" }}>{summary.rate}%</div>
          <div>
            <div className="label">Attendance Rate</div>
            <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>{summary.recorded} of {summary.total}</span>
          </div>
        </div>
      </div>

      {/* ── Table Toolbar ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            type="text"
            className="form-input"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search student or LRN in class..."
            style={{ width: "260px", fontSize: "0.85rem", padding: "0.45rem 0.75rem" }}
          />
          <span style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)" }}>
            Showing {filteredStudents.length} of {students.length} students
          </span>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => markAll("present")}
            style={{ fontSize: "0.8rem", padding: "0.45rem 0.85rem" }}
          >
            ✓ Mark All Present
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => markAll("absent")}
            style={{ fontSize: "0.8rem", padding: "0.45rem 0.85rem" }}
          >
            ✗ Mark All Absent
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={clearAll}
            style={{ fontSize: "0.8rem", padding: "0.45rem 0.85rem" }}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* ── Notifications ── */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 0 }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}>×</button>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: 0 }}>
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}>×</button>
        </div>
      )}

      {/* ── Student Sheet Table ── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--clr-text-muted)" }}>
            <div className="spinner" style={{ margin: "0 auto 1rem" }} />
            Loading class attendance roster...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3.5rem 1rem", color: "var(--clr-text-muted)" }}>
            <p style={{ fontSize: "1.1rem", fontWeight: 500, marginBottom: "0.5rem" }}>
              {students.length === 0 ? `No students found enrolled in Grade ${gradeLevel}.` : "No matching students found."}
            </p>
            <p style={{ fontSize: "0.85rem" }}>
              {students.length === 0 ? "Ensure students have been registered and enrolled for this grade level." : "Try clearing your search keyword."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ width: "50px", textAlign: "center" }}>#</th>
                  <th style={{ minWidth: "220px" }}>Student Details</th>
                  <th style={{ width: "100px" }}>Sex</th>
                  <th style={{ minWidth: "320px", textAlign: "center" }}>Attendance Status</th>
                  <th style={{ minWidth: "240px" }}>Remarks / Excuse Note</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((st, idx) => {
                  const row = rows[st.id] || { status: null, remarks: "" };
                  const currentStatus = row.status;

                  return (
                    <tr key={st.id} style={{ background: currentStatus === "absent" ? "rgba(239, 68, 68, 0.04)" : undefined }}>
                      <td style={{ textAlign: "center", color: "var(--clr-text-muted)", fontSize: "0.8rem" }}>
                        {idx + 1}
                      </td>

                      <td>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 600, color: "var(--clr-text)" }}>
                            {st.lastName}, {st.firstName} {st.middleName ? `${st.middleName[0]}.` : ""}
                          </span>
                          <span style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "var(--clr-text-muted)" }}>
                            LRN: {st.lrn}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            textTransform: "uppercase",
                            fontWeight: 600,
                            background: st.sex === "female" ? "rgba(236, 72, 153, 0.15)" : "rgba(59, 130, 246, 0.15)",
                            color: st.sex === "female" ? "#f472b6" : "#60a5fa",
                          }}
                        >
                          {st.sex}
                        </span>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <div className="attendance-status-group">
                          <button
                            type="button"
                            className={`attendance-status-btn ${currentStatus === "present" ? "active-present" : ""}`}
                            onClick={() => handleStatusChange(st.id, "present")}
                            title="Mark Present"
                          >
                            ✓ Present
                          </button>
                          <button
                            type="button"
                            className={`attendance-status-btn ${currentStatus === "late" ? "active-late" : ""}`}
                            onClick={() => handleStatusChange(st.id, "late")}
                            title="Mark Late / Tardy"
                          >
                            ⏱ Late
                          </button>
                          <button
                            type="button"
                            className={`attendance-status-btn ${currentStatus === "absent" ? "active-absent" : ""}`}
                            onClick={() => handleStatusChange(st.id, "absent")}
                            title="Mark Absent"
                          >
                            ✗ Absent
                          </button>
                          <button
                            type="button"
                            className={`attendance-status-btn ${currentStatus === "excused" ? "active-excused" : ""}`}
                            onClick={() => handleStatusChange(st.id, "excused")}
                            title="Mark Excused"
                          >
                            📋 Excused
                          </button>
                        </div>
                      </td>

                      <td>
                        <input
                          type="text"
                          className="form-input"
                          value={row.remarks || ""}
                          onChange={(e) => handleRemarksChange(st.id, e.target.value)}
                          placeholder="e.g. Medical certificate, family emergency"
                          style={{ width: "100%", fontSize: "0.8rem", padding: "0.35rem 0.6rem" }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Floating / Bottom Save Bar ── */}
      <div
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 1.5rem",
          position: "sticky",
          bottom: "1rem",
          zIndex: 10,
          boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
          border: hasChanges ? "1px solid var(--clr-primary)" : "1px solid var(--clr-border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {hasChanges ? (
            <span style={{ fontSize: "0.85rem", color: "var(--clr-warning)", fontWeight: 500 }}>
              ● You have unsaved attendance changes.
            </span>
          ) : (
            <span style={{ fontSize: "0.85rem", color: "var(--clr-text-muted)" }}>
              All records for {date} are up to date.
            </span>
          )}
          <span style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)" }}>
            ({summary.recorded} marked / {summary.unrecorded} unmarked)
          </span>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving || loading || summary.recorded === 0}
          style={{ padding: "0.6rem 1.5rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          {saving ? (
            <>
              <div className="spinner" style={{ width: "14px", height: "14px", borderWidth: "2px" }} />
              Saving Attendance...
            </>
          ) : (
            <>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              Save Attendance Sheet
            </>
          )}
        </button>
      </div>
    </div>
  );
}
