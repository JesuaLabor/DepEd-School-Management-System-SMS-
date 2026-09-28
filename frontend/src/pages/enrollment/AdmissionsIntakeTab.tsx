import { useState, useEffect, useCallback } from "react";
import type { AdmissionApplication, ApplicationStatus, SectionWithAdviser } from "@/types";
import { api } from "@/services/api";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  submitted: "Submitted (Pending)",
  under_review: "Under Review",
  approved: "Enrolled & Approved",
  rejected: "Rejected",
};

const STATUS_BADGES: Record<ApplicationStatus, string> = {
  submitted: "badge-warning",
  under_review: "badge-primary",
  approved: "badge-success",
  rejected: "badge-danger",
};

export default function AdmissionsIntakeTab() {
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [gradeFilter, setGradeFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  // Review modal
  const [activeApp, setActiveApp] = useState<AdmissionApplication | null>(null);
  const [availableSections, setAvailableSections] = useState<SectionWithAdviser[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [assignedLrn, setAssignedLrn] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadApplications = useCallback(() => {
    setLoading(true);
    api.admissions.list({
      status: statusFilter ? (statusFilter as ApplicationStatus) : undefined,
      gradeLevel: gradeFilter ? Number(gradeFilter) : undefined,
      search: search || undefined,
    })
      .then((res) => {
        setApplications(res.data || []);
        setTotal(res.total || 0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [statusFilter, gradeFilter, search]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  // Load sections when reviewing an application
  useEffect(() => {
    if (activeApp) {
      setSelectedSectionId("");
      setAssignedLrn(activeApp.lrn || "");
      setRemarks(activeApp.reviewRemarks || "");
      api.sections.list({ gradeLevel: activeApp.targetGradeLevel, schoolYear: activeApp.schoolYear })
        .then((res) => setAvailableSections(res.data || []))
        .catch(() => setAvailableSections([]));
    }
  }, [activeApp]);

  async function handleApprove() {
    if (!activeApp) return;
    setReviewLoading(true);
    try {
      await api.admissions.approve(activeApp.id, {
        assignedLrn: assignedLrn.trim() || undefined,
        sectionId: selectedSectionId || undefined,
        remarks: remarks || undefined,
      });
      setActionSuccess(`Application #${activeApp.applicationNo} approved and student enrolled!`);
      setActiveApp(null);
      loadApplications();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to approve application");
    } finally {
      setReviewLoading(false);
    }
  }

  async function handleSetStatus(status: ApplicationStatus, notes?: string) {
    if (!activeApp) return;
    setReviewLoading(true);
    try {
      await api.admissions.updateStatus(activeApp.id, {
        status,
        remarks: notes || remarks || undefined,
      });
      setActionSuccess(`Application #${activeApp.applicationNo} marked as ${STATUS_LABELS[status]}.`);
      setActiveApp(null);
      loadApplications();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setReviewLoading(false);
    }
  }

  return (
    <div>
      {error && <div className="alert alert-error mb-4">{error}</div>}
      {actionSuccess && (
        <div className="alert alert-success mb-4" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>{actionSuccess}</span>
          <button className="btn-ghost" style={{ padding: "0 0.5rem" }} onClick={() => setActionSuccess(null)}>✕</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4" style={{ flexWrap: "wrap" }}>
        <input
          type="text"
          className="form-input"
          style={{ maxWidth: 260 }}
          placeholder="Search by Name, LRN, App #…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="form-select"
          style={{ maxWidth: 160 }}
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
        >
          <option value="">All Grades</option>
          {[7, 8, 9, 10, 11, 12].map((g) => (
            <option key={g} value={g}>Grade {g}</option>
          ))}
        </select>

        <select
          className="form-select"
          style={{ maxWidth: 180 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Enrolled & Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <span style={{ marginLeft: "auto", fontSize: "0.85rem", color: "var(--clr-text-muted)" }}>
          Total Online Applicants: <strong>{total}</strong>
        </span>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>App Number</th>
              <th>Applicant Name</th>
              <th>LRN</th>
              <th>Grade & Strand</th>
              <th>Guardian / Contact</th>
              <th>Status</th>
              <th>Date Applied</th>
              <th style={{ textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "3rem" }}>
                  <div className="spinner" style={{ margin: "0 auto" }} />
                </td>
              </tr>
            ) : applications.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state" style={{ padding: "3rem 1rem", textAlign: "center" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📬</div>
                    <h3>No Online Applications Found</h3>
                    <p style={{ color: "var(--clr-text-muted)" }}>
                      Online applications submitted through the public portal will appear here for verification.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              applications.map((app) => (
                <tr key={app.id}>
                  <td>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--clr-primary)" }}>
                      {app.applicationNo}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>
                      {app.lastName}, {app.firstName} {app.middleName || ""}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>
                      {app.sex} • {new Date(app.birthDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                      {app.lrn || <span style={{ color: "var(--clr-text-muted)", fontStyle: "italic" }}>No LRN (New)</span>}
                    </span>
                  </td>
                  <td>
                    <div>
                      <span className="badge badge-neutral">Grade {app.targetGradeLevel}</span>
                    </div>
                    {app.strand && (
                      <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", marginTop: "2px" }}>
                        {app.strand.toUpperCase()} ({app.track || "SHS"})
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>{app.guardian?.name || "—"}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>{app.guardian?.contactNo || "—"}</div>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGES[app.status]}`}>
                      {STATUS_LABELS[app.status]}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)" }}>
                    {new Date(app.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => setActiveApp(app)}
                    >
                      Review & Enroll
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Review & Approve Modal */}
      {activeApp && (
        <div className="modal-backdrop" onClick={() => setActiveApp(null)}>
          <div
            className="modal"
            style={{ maxWidth: 650, maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Admission Application Review</h2>
                <div style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)" }}>
                  Application Reference: <strong style={{ color: "var(--clr-primary)" }}>{activeApp.applicationNo}</strong> (SY {activeApp.schoolYear})
                </div>
              </div>
              <button className="modal-close" onClick={() => setActiveApp(null)}>✕</button>
            </div>

            <div style={{ padding: "1rem 0" }}>
              {/* Applicant Details Grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
                background: "var(--clr-surface-2, #f8fafc)",
                padding: "1rem",
                borderRadius: "var(--radius-sm)",
                marginBottom: "1.25rem",
                fontSize: "0.85rem"
              }}>
                <div>
                  <div style={{ color: "var(--clr-text-muted)", fontSize: "0.75rem" }}>Learner Full Name</div>
                  <div style={{ fontWeight: 600 }}>{activeApp.lastName}, {activeApp.firstName} {activeApp.middleName || ""}</div>
                </div>
                <div>
                  <div style={{ color: "var(--clr-text-muted)", fontSize: "0.75rem" }}>Learner Reference Number (LRN)</div>
                  <div style={{ fontWeight: 600, fontFamily: "monospace" }}>{activeApp.lrn || "None (New Student / Transferee)"}</div>
                </div>
                <div>
                  <div style={{ color: "var(--clr-text-muted)", fontSize: "0.75rem" }}>PSA Birth Certificate Number</div>
                  <div style={{ fontWeight: 600, fontFamily: "monospace" }}>{activeApp.psaBirthCertNo || "—"}</div>
                </div>
                <div>
                  <div style={{ color: "var(--clr-text-muted)", fontSize: "0.75rem" }}>Date of Birth & Sex</div>
                  <div style={{ fontWeight: 600 }}>
                    {new Date(activeApp.birthDate).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })} ({activeApp.sex})
                  </div>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <div style={{ color: "var(--clr-text-muted)", fontSize: "0.75rem" }}>Current Residential Address</div>
                  <div style={{ fontWeight: 500 }}>
                    {activeApp.address?.street ? `${activeApp.address.street}, ` : ""}
                    Brgy. {activeApp.address?.barangay || "—"}, {activeApp.address?.city || "—"}, {activeApp.address?.province || "—"}
                  </div>
                </div>
                <div>
                  <div style={{ color: "var(--clr-text-muted)", fontSize: "0.75rem" }}>Parent / Guardian</div>
                  <div style={{ fontWeight: 600 }}>{activeApp.guardian?.name} ({activeApp.guardian?.relationship})</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)" }}>{activeApp.guardian?.contactNo}</div>
                </div>
                <div>
                  <div style={{ color: "var(--clr-text-muted)", fontSize: "0.75rem" }}>Previous School</div>
                  <div style={{ fontWeight: 600 }}>{activeApp.previousSchool || "—"}</div>
                  {activeApp.previousSchoolId && (
                    <div style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)" }}>
                      School ID: {activeApp.previousSchoolId}
                    </div>
                  )}
                </div>
              </div>

              {/* Assignment Controls */}
              {activeApp.status !== "approved" && (
                <>
                  {!activeApp.lrn && (
                    <div className="form-group mb-3">
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Assign DepEd Learner Reference Number (12 digits)
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 109876543210"
                        maxLength={12}
                        value={assignedLrn}
                        onChange={(e) => setAssignedLrn(e.target.value)}
                      />
                      <p style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", marginTop: "0.25rem" }}>
                        Learner does not have an LRN yet. System can assign this official DepEd LRN upon enrollment.
                      </p>
                    </div>
                  )}

                  <div style={{ marginBottom: "1.25rem" }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Assign to Class Section (Grade {activeApp.targetGradeLevel})
                    </label>
                    <select
                      className="form-select"
                      value={selectedSectionId}
                      onChange={(e) => setSelectedSectionId(e.target.value)}
                    >
                      <option value="">-- Leave Unassigned for now --</option>
                      {availableSections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.name} {sec.strand ? `(${sec.strand.toUpperCase()})` : ""} - Room {sec.room || "TBA"} ({sec.studentCount}/{sec.maxCapacity} students)
                        </option>
                      ))}
                    </select>
                    <p style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", marginTop: "0.25rem" }}>
                      Selecting a section will immediately register the student into the class roster upon approval.
                    </p>
                  </div>
                </>
              )}

              {/* Reviewer Notes */}
              <div className="form-group mb-4">
                <label className="form-label">Reviewer / Registrar Notes</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="e.g. Birth certificate verified, Form 137 requested from previous school..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {activeApp.status !== "rejected" && activeApp.status !== "approved" && (
                  <button
                    className="btn btn-outline"
                    style={{ color: "var(--clr-danger)", borderColor: "var(--clr-danger)" }}
                    disabled={reviewLoading}
                    onClick={() => handleSetStatus("rejected")}
                  >
                    Reject Application
                  </button>
                )}
                {activeApp.status === "submitted" && (
                  <button
                    className="btn btn-outline"
                    disabled={reviewLoading}
                    onClick={() => handleSetStatus("under_review")}
                  >
                    Mark Under Review
                  </button>
                )}
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn btn-outline" onClick={() => setActiveApp(null)}>
                  Close
                </button>
                {activeApp.status !== "approved" ? (
                  <button
                    className="btn btn-primary"
                    disabled={reviewLoading}
                    onClick={handleApprove}
                  >
                    {reviewLoading ? "Processing…" : "✓ Approve & Enroll Student"}
                  </button>
                ) : (
                  <span className="badge badge-success" style={{ alignSelf: "center", padding: "0.4rem 0.8rem" }}>
                    Already Enrolled
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
