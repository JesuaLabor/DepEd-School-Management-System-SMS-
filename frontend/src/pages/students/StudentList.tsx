import { useEffect, useState, useCallback } from "react";
import type { Student, EnrollmentStatus, Strand } from "@/types";
import { STRAND_LABELS, STATUS_LABELS } from "@/types";
import { api } from "@/services/api";
import StudentDrawer from "./StudentDrawer";
import StudentForm   from "./StudentForm";
import { useAuth } from "@/context/AuthContext";

// ── Helpers ──────────────────────────────────────────────────────────────────
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

// ── Component ────────────────────────────────────────────────────────────────
export default function StudentList() {
  const { user } = useAuth();
  const canEdit = user?.role === "super_admin" || user?.role === "registrar";

  const [students, setStudents] = useState<Student[]>([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  // Filters
  const [search,     setSearch]     = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [strand,     setStrand]     = useState("");
  const [status,     setStatus]     = useState("");
  const [schoolYear, setSchoolYear] = useState("");

  // UI state
  const [selected,    setSelected]    = useState<Student | null>(null);
  const [showAdd,     setShowAdd]     = useState(false);
  const [showEdit,    setShowEdit]    = useState(false);
  const [statusModal, setStatusModal] = useState<{ student: Student; next: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.students.list({
      search:     search    || undefined,
      gradeLevel: gradeLevel ? Number(gradeLevel) : undefined,
      strand:     strand    || undefined,
      status:     status    || undefined,
      schoolYear: schoolYear || undefined,
    })
      .then(res => { setStudents(res.data); setTotal(res.total); })
      .catch(e  => setError(e.message))
      .finally(()=> setLoading(false));
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

  const SHS_STRANDS: Strand[] = ["academic","tvl","sports","arts_design"];

  return (
    <>
      <div className="page-header">
        <h1>Students</h1>
        <p>
          Manage learner records for JHS (Grades 7–10) and SHS (Grades 11–12).
          {" "}<strong style={{ color: "var(--clr-accent)" }}>{total}</strong> student{total !== 1 ? "s" : ""} found.
        </p>
      </div>

      <div className="page-body">
        {error && <div className="alert alert-error mb-4">{error}</div>}

        {/* ── Toolbar ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-4" style={{ flexWrap: "wrap" }}>
          <input
            className="form-input" style={{ maxWidth: 260 }}
            placeholder="Search name or LRN…"
            value={debouncedSearch}
            onChange={(e) => setDebouncedSearch(e.target.value)}
          />

          <select className="form-select" style={{ maxWidth: 150 }}
            value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)}>
            <option value="">All grades</option>
            {[7,8,9,10,11,12].map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>

          <select className="form-select" style={{ maxWidth: 160 }}
            value={strand} onChange={(e) => setStrand(e.target.value)}>
            <option value="">All strands</option>
            {SHS_STRANDS.map(s => <option key={s} value={s}>{STRAND_LABELS[s]}</option>)}
          </select>

          <select className="form-select" style={{ maxWidth: 150 }}
            value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {(["enrolled","dropped","transferred","graduated"] as EnrollmentStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>

          <select className="form-select" style={{ maxWidth: 150 }}
            value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)}>
            {SCHOOL_YEARS.map(sy => <option key={sy} value={sy}>{sy || "All school years"}</option>)}
          </select>

          {canEdit && (
            <button className="btn btn-primary" style={{ marginLeft: "auto" }}
              onClick={() => setShowAdd(true)}>
              + Enroll Student
            </button>
          )}
        </div>

        {/* ── Table ───────────────────────────────────────────────────── */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>LRN</th>
                <th>Name</th>
                <th>Grade</th>
                <th>Strand / Track</th>
                <th>School Year</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--clr-text-muted)" }}>
                  <div className="spinner" style={{ margin: "0 auto" }} />
                </td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-icon">🎓</div>
                    <h3>No students found</h3>
                    <p>Try adjusting your filters or enroll a new student.</p>
                  </div>
                </td></tr>
              ) : students.map(s => (
                <tr key={s.id} style={{ cursor: "pointer" }} onClick={() => setSelected(s)}>
                  <td><span style={{ fontFamily: "monospace", fontSize: "0.8rem", letterSpacing: "0.05em" }}>{s.lrn}</span></td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div style={{
                        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                        background: s.sex === "Female"
                          ? "linear-gradient(135deg,#db2777,#f43f5e)"
                          : "linear-gradient(135deg, #1e40af, #3b82f6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.65rem", fontWeight: 700, color: "#fff",
                      }}>
                        {s.firstName[0]}{s.lastName[0]}
                      </div>
                      <span className="full-name">{s.lastName}, {s.firstName}{s.middleName ? ` ${s.middleName[0]}.` : ""}</span>
                    </div>
                  </td>
                  <td><span className="badge badge-neutral">Grade {s.gradeLevel}</span></td>
                  <td style={{ color: "var(--clr-text-muted)", fontSize: "0.85rem" }}>
                    {s.gradeLevel >= 11 && s.strand ? STRAND_LABELS[s.strand] : s.gradeLevel >= 11 ? "No strand" : "—"}
                  </td>
                  <td style={{ color: "var(--clr-text-muted)", fontSize: "0.85rem" }}>{s.schoolYear}</td>
                  <td>{statusBadge(s.status)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelected(s)}>View →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-muted text-sm mt-2">
          Showing {students.length} of {total} students
        </p>
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
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Change Enrollment Status</h2>
              <button className="modal-close" onClick={() => setStatusModal(null)}>✕</button>
            </div>
            <p className="text-sm" style={{ color: "var(--clr-text-muted)", marginBottom: "1.5rem" }}>
              Mark <strong>{statusModal.student.firstName} {statusModal.student.lastName}</strong> as{" "}
              <strong style={{ color: "var(--clr-accent)" }}>{STATUS_LABELS[statusModal.next as EnrollmentStatus]}</strong>?
              This action will be recorded in their profile.
            </p>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setStatusModal(null)}>Cancel</button>
              <button className="btn btn-primary"
                onClick={() => handleStatusChange(statusModal.student, statusModal.next)}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
