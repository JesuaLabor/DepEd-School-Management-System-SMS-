import { useEffect, useState, useCallback } from "react";
import type {
  Enrollment, EnrollmentRecordStatus, EnrollmentType,
  EnrollmentSummary, Strand,
} from "@/types";
import {
  ENROLLMENT_STATUS_LABELS, ENROLLMENT_TYPE_LABELS,
  STRAND_LABELS,
} from "@/types";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import NewEnrollmentModal from "./NewEnrollmentModal";
import PromotionWizard from "./PromotionWizard";
import AdmissionsIntakeTab from "./AdmissionsIntakeTab";

// ── Helpers ──────────────────────────────────────────────────────────────────
function statusBadge(s: EnrollmentRecordStatus) {
  return (
    <span className={`badge ${{
      pending:  "badge-warning",
      approved: "badge-success",
      rejected: "badge-danger",
    }[s]}`}>{ENROLLMENT_STATUS_LABELS[s]}</span>
  );
}

function typeBadge(t: EnrollmentType) {
  return (
    <span className={`badge ${{
      new: "badge-indigo", returning: "badge-neutral",
      transferee: "badge-primary", promotion: "badge-success",
    }[t]}`}>{ENROLLMENT_TYPE_LABELS[t]}</span>
  );
}

const currentYear = new Date().getFullYear();
const SCHOOL_YEARS = Array.from({ length: 5 }, (_, i) => {
  const y = currentYear - 1 + i; return `${y}-${y + 1}`;
});

// ── Main Component ───────────────────────────────────────────────────────────
export default function EnrollmentPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "super_admin" || user?.role === "registrar";

  const [activeTab,   setActiveTab]   = useState<"enrollments" | "intake">("enrollments");
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [total,       setTotal]       = useState(0);
  const [summary,     setSummary]     = useState<EnrollmentSummary | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  // Filters
  const [schoolYear,  setSchoolYear]  = useState(SCHOOL_YEARS[1]);
  const [gradeLevel,  setGradeLevel]  = useState("");
  const [status,      setStatus]      = useState("");
  const [type,        setType]        = useState("");
  const [dSearch,     setDSearch]     = useState("");
  const [search,      setSearch]      = useState("");

  // Modals
  const [showNew,      setShowNew]      = useState(false);
  const [showPromote,  setShowPromote]  = useState(false);
  const [rejectModal,  setRejectModal]  = useState<Enrollment | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(dSearch), 350);
    return () => clearTimeout(t);
  }, [dSearch]);

  const loadSummary = useCallback(() => {
    api.enrollments.summary(schoolYear).then(setSummary).catch(() => {});
  }, [schoolYear]);

  const loadEnrollments = useCallback(() => {
    setLoading(true);
    api.enrollments.list({
      schoolYear, gradeLevel: gradeLevel ? Number(gradeLevel) : undefined,
      status: status || undefined, type: type || undefined,
      search: search || undefined,
    })
      .then(r => { setEnrollments(r.data); setTotal(r.total); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [schoolYear, gradeLevel, status, type, search]);

  useEffect(() => { loadEnrollments(); loadSummary(); }, [loadEnrollments, loadSummary]);

  async function handleApprove(e: Enrollment) {
    setActionLoading(e.id);
    try {
      await api.enrollments.approve(e.id);
      loadEnrollments(); loadSummary();
    } catch (err) { alert(err instanceof Error ? err.message : "Failed"); }
    finally { setActionLoading(null); }
  }

  async function handleReject() {
    if (!rejectModal) return;
    setActionLoading(rejectModal.id);
    try {
      await api.enrollments.reject(rejectModal.id, rejectReason);
      setRejectModal(null); setRejectReason("");
      loadEnrollments(); loadSummary();
    } catch (err) { alert(err instanceof Error ? err.message : "Failed"); }
    finally { setActionLoading(null); }
  }

  async function handleDelete(e: Enrollment) {
    if (!confirm(`Delete this ${e.status} enrollment?`)) return;
    try {
      await api.enrollments.remove(e.id);
      loadEnrollments(); loadSummary();
    } catch (err) { alert(err instanceof Error ? err.message : "Failed"); }
  }

  const statCards = [
    { label: "Total",    value: summary?.summary.total    ?? "—", color: "var(--clr-text)",    icon: "📋" },
    { label: "Pending",  value: summary?.summary.pending  ?? "—", color: "var(--clr-warning)",  icon: "⏳" },
    { label: "Approved", value: summary?.summary.approved ?? "—", color: "var(--clr-success)",  icon: "✅" },
    { label: "Rejected", value: summary?.summary.rejected ?? "—", color: "var(--clr-danger)",   icon: "❌" },
  ];

  return (
    <>
      <div className="page-header">
        <h1>Enrollment & Admissions</h1>
        <p>Process regular student enrollments and verify online intake applications for the school year.</p>

        {/* Tab Buttons */}
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", borderBottom: "1px solid var(--clr-border, #e2e8f0)" }}>
          <button
            type="button"
            onClick={() => setActiveTab("enrollments")}
            style={{
              padding: "0.6rem 1.25rem",
              fontWeight: 600,
              fontSize: "0.875rem",
              background: "none",
              border: "none",
              borderBottom: activeTab === "enrollments" ? "2px solid var(--clr-primary, #1e40af)" : "2px solid transparent",
              color: activeTab === "enrollments" ? "var(--clr-primary, #1e40af)" : "var(--clr-text-muted, #64748b)",
              cursor: "pointer",
            }}
          >
            📋 Regular Enrollments
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("intake")}
            style={{
              padding: "0.6rem 1.25rem",
              fontWeight: 600,
              fontSize: "0.875rem",
              background: "none",
              border: "none",
              borderBottom: activeTab === "intake" ? "2px solid var(--clr-primary, #1e40af)" : "2px solid transparent",
              color: activeTab === "intake" ? "var(--clr-primary, #1e40af)" : "var(--clr-text-muted, #64748b)",
              cursor: "pointer",
            }}
          >
            📬 Online Admissions Intake
          </button>
        </div>
      </div>

      <div className="page-body">
        {activeTab === "intake" ? (
          <AdmissionsIntakeTab />
        ) : (
          <>
            {error && <div className="alert alert-error mb-4">{error}</div>}

        {/* ── Summary Stats ─────────────────────────────────────────────── */}
        <div className="stats-grid mb-6">
          {statCards.map(c => (
            <div key={c.label} className="stat-card">
              <div className="stat-icon">{c.icon}</div>
              <div className="stat-value" style={{ color: c.color }}>{c.value}</div>
              <div className="stat-label">{c.label} Enrollments</div>
            </div>
          ))}
        </div>

        {/* ── Grade breakdown ───────────────────────────────────────────── */}
        {summary && summary.gradeBreakdown.length > 0 && (
          <div className="card mb-6">
            <div className="card-header">
              <span className="card-title">Approved Enrollment by Grade Level — {schoolYear}</span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {summary.gradeBreakdown.map(g => (
                <div key={g.grade} style={{
                  background: "var(--clr-surface-2)", border: "1px solid var(--clr-border)",
                  borderRadius: "var(--radius-sm)", padding: "0.5rem 1rem", textAlign: "center",
                }}>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--clr-accent)" }}>{g.count}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--clr-text-muted)" }}>
                    Grade {g.grade} {g.grade <= 10 ? "(JHS)" : "(SHS)"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Toolbar ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-4" style={{ flexWrap: "wrap" }}>
          <select className="form-select" style={{ maxWidth: 160 }}
            value={schoolYear} onChange={e => setSchoolYear(e.target.value)}>
            {SCHOOL_YEARS.map(sy => <option key={sy} value={sy}>{sy}</option>)}
          </select>

          <select className="form-select" style={{ maxWidth: 140 }}
            value={gradeLevel} onChange={e => setGradeLevel(e.target.value)}>
            <option value="">All grades</option>
            {[7,8,9,10,11,12].map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>

          <select className="form-select" style={{ maxWidth: 140 }}
            value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {(["pending","approved","rejected"] as EnrollmentRecordStatus[]).map(s => (
              <option key={s} value={s}>{ENROLLMENT_STATUS_LABELS[s]}</option>
            ))}
          </select>

          <select className="form-select" style={{ maxWidth: 150 }}
            value={type} onChange={e => setType(e.target.value)}>
            <option value="">All types</option>
            {(["new","returning","transferee","promotion"] as EnrollmentType[]).map(t => (
              <option key={t} value={t}>{ENROLLMENT_TYPE_LABELS[t]}</option>
            ))}
          </select>

          <input className="form-input" style={{ maxWidth: 220 }}
            placeholder="Search student name / LRN…"
            value={dSearch} onChange={e => setDSearch(e.target.value)} />

          {canEdit && (
            <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
              <button className="btn btn-outline" onClick={() => setShowPromote(true)}>
                🎓 Bulk Promote
              </button>
              <button className="btn btn-primary" onClick={() => setShowNew(true)}>
                + New Enrollment
              </button>
            </div>
          )}
        </div>

        {/* ── Table ─────────────────────────────────────────────────────── */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>LRN</th>
                <th>Grade</th>
                <th>Strand</th>
                <th>Type</th>
                <th>Status</th>
                <th>Applied</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: "3rem" }}>
                  <div className="spinner" style={{ margin: "0 auto" }} />
                </td></tr>
              ) : enrollments.length === 0 ? (
                <tr><td colSpan={8}>
                  <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <h3>No enrollments found</h3>
                    <p>Adjust your filters or create a new enrollment application.</p>
                  </div>
                </td></tr>
              ) : enrollments.map(e => (
                <tr key={e.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div style={{
                        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                        background: e.student?.sex === "Female"
                          ? "linear-gradient(135deg,#db2777,#f43f5e)"
                          : "linear-gradient(135deg,#2563eb,#0ea5e9)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.65rem", fontWeight: 700, color: "#fff",
                      }}>
                        {e.student ? `${e.student.firstName[0]}${e.student.lastName[0]}` : "?"}
                      </div>
                      <span className="full-name">
                        {e.student ? `${e.student.lastName}, ${e.student.firstName}` : e.studentId}
                      </span>
                    </div>
                  </td>
                  <td><span style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{e.student?.lrn ?? "—"}</span></td>
                  <td><span className="badge badge-neutral">Grade {e.gradeLevel}</span></td>
                  <td style={{ fontSize: "0.82rem", color: "var(--clr-text-muted)" }}>
                    {e.gradeLevel >= 11 && e.strand ? STRAND_LABELS[e.strand as Strand] : "—"}
                  </td>
                  <td>{typeBadge(e.type)}</td>
                  <td>
                    {statusBadge(e.status)}
                    {e.status === "rejected" && e.rejectedReason && (
                      <div style={{ fontSize: "0.72rem", color: "var(--clr-danger)", marginTop: 2 }}>
                        {e.rejectedReason}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)" }}>
                    {new Date(e.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  {canEdit && (
                    <td>
                      <div className="flex gap-2">
                        {e.status === "pending" && (
                          <>
                            <button
                              className="btn btn-sm btn-primary"
                              disabled={actionLoading === e.id}
                              onClick={() => handleApprove(e)}
                            >
                              {actionLoading === e.id ? "…" : "Approve"}
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              disabled={actionLoading === e.id}
                              onClick={() => { setRejectModal(e); setRejectReason(""); }}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {e.status !== "approved" && (
                          <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(e)}>🗑</button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-muted text-sm mt-2">
          Showing {enrollments.length} of {total} enrollments
        </p>
          </>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {showNew && (
        <NewEnrollmentModal
          schoolYear={schoolYear}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); loadEnrollments(); loadSummary(); }}
        />
      )}

      {showPromote && (
        <PromotionWizard
          onClose={() => setShowPromote(false)}
          onDone={() => { setShowPromote(false); loadEnrollments(); loadSummary(); }}
        />
      )}

      {rejectModal && (
        <div className="modal-backdrop" onClick={() => setRejectModal(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reject Enrollment</h2>
              <button className="modal-close" onClick={() => setRejectModal(null)}>✕</button>
            </div>
            <p className="text-sm text-muted mb-4">
              Reject enrollment for <strong>{rejectModal.student?.lastName}, {rejectModal.student?.firstName}</strong>?
              Provide a reason (optional).
            </p>
            <div className="form-group mb-4">
              <label className="form-label">Reason</label>
              <textarea className="form-input" rows={3}
                placeholder="e.g. Incomplete requirements, wrong school year…"
                value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setRejectModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleReject} disabled={!!actionLoading}>
                {actionLoading ? "Rejecting…" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
