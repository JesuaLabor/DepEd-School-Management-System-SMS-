import { useEffect, useState, useCallback } from "react";
import type { Student, EnrollmentStatus, Strand } from "@/types";
import { STRAND_LABELS, STATUS_LABELS } from "@/types";
import { api } from "@/services/api";
import StudentDrawer from "./StudentDrawer";
import StudentForm from "./StudentForm";
import { useAuth } from "@/context/AuthContext";
import { exportToCsv, type CsvColumn } from "@/utils/exportCsv";

function statusBadge(s: EnrollmentStatus) {
  const cls = {
    enrolled:    "badge badge-success",
    dropped:     "badge badge-danger",
    transferred: "badge badge-warning",
    graduated:   "badge badge-primary",
  }[s];
  return <span className={cls}>{STATUS_LABELS[s]}</span>;
}

const currentYear = new Date().getFullYear();
const SCHOOL_YEARS = ["", ...Array.from({ length: 4 }, (_, i) => {
  const y = currentYear - 1 + i; return `${y}-${y + 1}`;
})];

export default function StudentList() {
  const { user } = useAuth();
  const canEdit = user?.role === "super_admin" || user?.role === "registrar";

  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [strand, setStrand] = useState("");
  const [status, setStatus] = useState("");
  const [schoolYear, setSchoolYear] = useState("");

  // UI state
  const [selected, setSelected] = useState<Student | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [statusModal, setStatusModal] = useState<{ student: Student; next: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.students.list({
      search:     search || undefined,
      gradeLevel: gradeLevel ? Number(gradeLevel) : undefined,
      strand:     strand || undefined,
      status:     status || undefined,
      schoolYear: schoolYear || undefined,
    })
      .then(res => { setStudents(res.data); setTotal(res.total); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, gradeLevel, strand, status, schoolYear]);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(debouncedSearch), 350);
    return () => clearTimeout(t);
  }, [debouncedSearch]);

  async function handleCreate(data: Partial<Student>) {
    await api.students.create(data);
    setShowAdd(false);
    load();
  }

  async function handleEdit(data: Partial<Student>) {
    if (!selected) return;
    const updated = await api.students.update(selected.id, data);
    setShowEdit(false);
    setSelected(updated);
    load();
  }

  async function handleStatusChange(student: Student, next: string) {
    await api.students.setStatus(student.id, next);
    setStatusModal(null);
    setSelected(null);
    load();
  }

  const SHS_STRANDS: Strand[] = ["academic", "tvl", "sports", "arts_design"];

  // KPI Calculations
  const jhsCount = students.filter(s => s.gradeLevel <= 10).length;
  const shsCount = students.filter(s => s.gradeLevel >= 11).length;
  const enrolledCount = students.filter(s => s.status === "enrolled").length;

  function handleExportCsv() {
    const columns: CsvColumn<Student>[] = [
      { label: "LRN", key: "lrn" },
      { label: "Last Name", key: "lastName" },
      { label: "First Name", key: "firstName" },
      { label: "Middle Name", key: (s) => s.middleName || "" },
      { label: "Extension", key: (s) => s.extName || "" },
      { label: "Sex", key: "sex" },
      { label: "Birthdate", key: (s) => s.birthDate ? s.birthDate.split("T")[0] : "" },
      { label: "Grade Level", key: "gradeLevel" },
      { label: "Strand", key: (s) => s.strand ? (STRAND_LABELS[s.strand] || s.strand) : "" },
      { label: "Status", key: (s) => STATUS_LABELS[s.status] || s.status },
      { label: "School Year", key: "schoolYear" },
      { label: "Contact No", key: (s) => s.contactNo || "" },
      { label: "Email", key: (s) => s.email || "" },
      { label: "Guardian Name", key: (s) => s.guardian?.name || "" },
      { label: "Guardian Contact", key: (s) => s.guardian?.contactNo || "" },
      { label: "Barangay", key: (s) => s.address?.barangay || "" },
      { label: "Municipality", key: (s) => s.address?.city || "" },
      { label: "Province", key: (s) => s.address?.province || "" },
    ];
    exportToCsv(`DepEd_KNHS_Students_${new Date().toISOString().split("T")[0]}`, columns, students);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* ── Sub-Header & Action ────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
            Learner Directory & Records
          </h1>
          <p style={{ margin: "3px 0 0", fontSize: "0.825rem", color: "#64748b" }}>
            Official DepEd Learner Information System (LIS) records for Junior & Senior High School.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleExportCsv}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              background: "#ffffff",
              borderColor: "#cbd5e1",
              color: "#334155",
              fontWeight: 600,
            }}
            title="Export full learner directory to CSV spreadsheet"
          >
            <span>📥</span>
            <span>Export CSV</span>
          </button>

          {canEdit && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAdd(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
              }}
            >
              <span>+</span>
              <span>Enroll New Student</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 4 Top KPI Stat Cards ──────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem",
        }}
      >
        {/* KPI 1: Total Students */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "1rem 1.25rem",
            border: "1px solid #e9edf4",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.02)",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#eff6ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              flexShrink: 0,
            }}
          >
            🎓
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>
              Total Learners
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
              {loading ? "..." : total}
            </div>
          </div>
        </div>

        {/* KPI 2: JHS (Grades 7–10) */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "1rem 1.25rem",
            border: "1px solid #e9edf4",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.02)",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#f0fdf4",
              color: "#16a34a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              flexShrink: 0,
            }}
          >
            🏫
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>
              Junior High (Gr 7–10)
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#16a34a", lineHeight: 1.1 }}>
              {loading ? "..." : jhsCount}
            </div>
          </div>
        </div>

        {/* KPI 3: SHS (Grades 11–12) */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "1rem 1.25rem",
            border: "1px solid #e9edf4",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.02)",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#f5f3ff",
              color: "#8b5cf6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              flexShrink: 0,
            }}
          >
            📚
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>
              Senior High (Gr 11–12)
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#8b5cf6", lineHeight: 1.1 }}>
              {loading ? "..." : shsCount}
            </div>
          </div>
        </div>

        {/* KPI 4: Currently Enrolled */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "1rem 1.25rem",
            border: "1px solid #e9edf4",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.02)",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#ecfdf5",
              color: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              flexShrink: 0,
            }}
          >
            📋
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>
              Active Enrolled
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#059669", lineHeight: 1.1 }}>
              {loading ? "..." : enrolledCount}
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* ── Table Card ──────────────────────────────────────────────────── */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e9edf4",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.02)",
          overflow: "hidden",
        }}
      >
        {/* Toolbar */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid #e9edf4",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
            background: "#ffffff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
            {/* Search Input */}
            <div style={{ position: "relative", width: "240px" }}>
              <input
                className="form-input"
                style={{ paddingLeft: "2.1rem" }}
                placeholder="Search name or LRN…"
                value={debouncedSearch}
                onChange={(e) => setDebouncedSearch(e.target.value)}
              />
              <span
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                  fontSize: "0.85rem",
                  pointerEvents: "none",
                }}
              >
                🔍
              </span>
            </div>

            <select
              className="form-select"
              style={{ width: "135px" }}
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
            >
              <option value="">All Grades</option>
              {[7, 8, 9, 10, 11, 12].map(g => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </select>

            <select
              className="form-select"
              style={{ width: "140px" }}
              value={strand}
              onChange={(e) => setStrand(e.target.value)}
            >
              <option value="">All Strands</option>
              {SHS_STRANDS.map(s => (
                <option key={s} value={s}>{STRAND_LABELS[s]}</option>
              ))}
            </select>

            <select
              className="form-select"
              style={{ width: "135px" }}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              {(["enrolled", "dropped", "transferred", "graduated"] as EnrollmentStatus[]).map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>

            <select
              className="form-select"
              style={{ width: "150px" }}
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
            >
              {SCHOOL_YEARS.map(sy => (
                <option key={sy} value={sy}>{sy || "All School Years"}</option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
            Showing <strong>{students.length}</strong> of <strong>{total}</strong> learners
          </div>
        </div>

        {/* Table Content */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>
                  Learner Reference (LRN)
                </th>
                <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>
                  Student Full Name
                </th>
                <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>
                  Grade Level
                </th>
                <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>
                  Strand / Track
                </th>
                <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>
                  School Year
                </th>
                <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>
                  Enrollment Status
                </th>
                <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
                    <div style={{ display: "inline-block", width: "24px", height: "24px", border: "2px solid #2563eb", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginBottom: "0.5rem" }} />
                    <div>Loading learner database…</div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
                    <div style={{ fontSize: "1.5rem", marginBottom: "0.35rem" }}>🎓</div>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>No learners found</div>
                    <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "2px" }}>
                      Try adjusting your grade level or search query.
                    </div>
                  </td>
                </tr>
              ) : (
                students.map(s => (
                  <tr
                    key={s.id}
                    onClick={() => setSelected(s)}
                    style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                  >
                    <td style={{ padding: "0.85rem 1.25rem" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#334155", background: "#f8fafc", padding: "3px 6px", borderRadius: "5px", border: "1px solid #e2e8f0" }}>
                        {s.lrn}
                      </span>
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            flexShrink: 0,
                            background: s.sex === "Female" ? "#fdf2f8" : "#eff6ff",
                            color: s.sex === "Female" ? "#db2777" : "#2563eb",
                            border: `1px solid ${s.sex === "Female" ? "#fce7f3" : "#dbeafe"}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                          }}
                        >
                          {s.firstName[0]}{s.lastName[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.875rem" }}>
                            {s.lastName}, {s.firstName}{s.middleName ? ` ${s.middleName[0]}.` : ""}
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                            {s.sex} · Age {Math.floor((Date.now() - new Date(s.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem" }}>
                      <span className="badge badge-neutral">
                        Grade {s.gradeLevel}
                      </span>
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem", color: "#475569", fontSize: "0.825rem" }}>
                      {s.gradeLevel >= 11 && s.strand ? (
                        <span className="badge badge-indigo">
                          {STRAND_LABELS[s.strand]}
                        </span>
                      ) : s.gradeLevel >= 11 ? (
                        <span style={{ color: "#94a3b8" }}>No strand</span>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem", color: "#64748b", fontSize: "0.825rem" }}>
                      {s.schoolYear}
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem" }}>
                      {statusBadge(s.status)}
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => setSelected(s)}
                        style={{ padding: "0.25rem 0.65rem", fontSize: "0.75rem" }}
                      >
                        View Profile →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Student detail drawer ──────────────────────────────────────── */}
      {selected && !showEdit && (
        <StudentDrawer
          student={selected}
          onClose={() => setSelected(null)}
          onEdit={() => setShowEdit(true)}
          onStatus={(next) => setStatusModal({ student: selected, next })}
        />
      )}

      {/* ── Add student modal ──────────────────────────────────────────── */}
      {showAdd && (
        <StudentForm
          title="Enroll New Student"
          onSubmit={handleCreate}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* ── Edit student modal ─────────────────────────────────────────── */}
      {showEdit && selected && (
        <StudentForm
          title="Edit Student Record"
          initial={selected}
          onSubmit={handleEdit}
          onClose={() => setShowEdit(false)}
        />
      )}

      {/* ── Status change confirmation ─────────────────────────────────── */}
      {statusModal && (
        <div className="modal-backdrop" onClick={() => setStatusModal(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Change Enrollment Status</h2>
              <button className="modal-close" onClick={() => setStatusModal(null)}>✕</button>
            </div>
            <p style={{ color: "#475569", fontSize: "0.875rem", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              Mark <strong>{statusModal.student.firstName} {statusModal.student.lastName}</strong> as{" "}
              <strong style={{ color: "#2563eb" }}>{STATUS_LABELS[statusModal.next as EnrollmentStatus]}</strong>?
              This action will update the official DepEd LIS registry.
            </p>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setStatusModal(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleStatusChange(statusModal.student, statusModal.next)}
              >
                Confirm Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
