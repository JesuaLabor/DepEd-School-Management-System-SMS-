import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "@/services/api";
import type { SectionRoster } from "@/types";
import AssignStudentsModal from "./AssignStudentsModal";
import CreateSectionModal  from "./CreateSectionModal";
import SectionScheduleTab from "./SectionScheduleTab";

export default function SectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [roster, setRoster]             = useState<SectionRoster | null>(null);
  const [loading, setLoading]           = useState<boolean>(true);
  const [error, setError]               = useState<string | null>(null);

  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal]     = useState<boolean>(false);
  const [actionError, setActionError]         = useState<string | null>(null);
  const [activeTab, setActiveTab]             = useState<"roster" | "schedule">("roster");

  const fetchRoster = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.sections.roster(id);
      setRoster(res);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load section details.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!id) return;
    if (!confirm(`Are you sure you want to remove ${studentName} from this section?`)) return;
    setActionError(null);
    try {
      await api.sections.removeStudent(id, studentId);
      fetchRoster();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to remove student from section.";
      setActionError(message);
    }
  };

  const handleDeleteSection = async () => {
    if (!id || !roster) return;
    if (
      !confirm(
        `Are you sure you want to delete Section "${roster.section.name}"?\nAll assigned students will be unsectioned.`
      )
    )
      return;
    try {
      await api.sections.remove(id);
      navigate("/sections");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete section.";
      setActionError(message);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem", color: "var(--clr-text-muted)" }}>
        <div className="spinner" style={{ margin: "0 auto 1rem" }} />
        Loading section roster...
      </div>
    );
  }

  if (error || !roster) {
    return (
      <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "var(--clr-danger)", marginBottom: "1rem" }}>⚠️ {error || "Section not found."}</p>
        <Link to="/sections" className="btn btn-secondary">
          ← Back to Sections
        </Link>
      </div>
    );
  }

  const { section, students, totalMale, totalFemale, totalCount } = roster;
  const capacityPct = Math.min(100, Math.round((totalCount / (section.maxCapacity || 45)) * 100));

  // Partition students into Male and Female as per standard DepEd SF1 format
  const maleStudents = students.filter((s) => s.sex?.toLowerCase() === "male");
  const femaleStudents = students.filter((s) => s.sex?.toLowerCase() === "female");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Top Header / Breadcrumb ── */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--clr-text-muted)", marginBottom: "0.25rem" }}>
            <Link to="/sections" style={{ color: "inherit" }}>
              Sections
            </Link>
            <span>/</span>
            <span style={{ color: "var(--clr-text)" }}>
              Grade {section.gradeLevel} - {section.name}
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, color: "var(--clr-text)" }}>
            Grade {section.gradeLevel} — Section {section.name}
          </h1>
          <p style={{ margin: "0.25rem 0 0 0", color: "var(--clr-text-muted)", fontSize: "0.9rem" }}>
            School Year {section.schoolYear} {section.room ? `· Room: ${section.room}` : ""} {section.strand ? `· Strand: ${section.strand.toUpperCase()}` : ""}
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowAssignModal(true)}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            ➕ Assign Students
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowEditModal(true)}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            ✏️ Edit Section
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.print()}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            🖨️ Print SF1 Roster
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleDeleteSection}
            style={{ color: "var(--clr-danger)", borderColor: "rgba(239,68,68,0.3)" }}
            title="Delete Section"
          >
            🗑
          </button>
        </div>
      </div>

      {actionError && (
        <div className="alert alert-error no-print">
          ⚠️ {actionError}
        </div>
      )}

      {/* ── Official DepEd SF1 Print Banner ── */}
      <div style={{ display: "none" }} className="print-header">
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Department of Education</h2>
          <h3 style={{ margin: "0.2rem 0", fontSize: "1rem" }}>School Form 1 (SF1) School Register</h3>
          <p style={{ margin: 0, fontSize: "0.85rem" }}>
            Grade Level: <strong>Grade {section.gradeLevel}</strong> · Section: <strong>{section.name}</strong> · School Year: <strong>{section.schoolYear}</strong>
            {section.adviser ? ` · Adviser: ${section.adviser.lastName}, ${section.adviser.firstName}` : ""}
          </p>
        </div>
      </div>

      {/* ── Section KPI Summary Cards ── */}
      <div className="no-print" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        {/* Adviser Card */}
        <div className="card" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "rgba(37, 99, 235, 0.15)",
              color: "var(--clr-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
            }}
          >
            👨‍🏫
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--clr-text-muted)", fontWeight: 600 }}>
              Class Adviser
            </div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
              {section.adviser ? `${section.adviser.lastName}, ${section.adviser.firstName}` : "Unassigned"}
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>
              {section.adviser?.email || "No teacher assigned"}
            </span>
          </div>
        </div>

        {/* Capacity Card */}
        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--clr-text-muted)", fontWeight: 600 }}>
              Enrolled Learners
            </span>
            <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>
              {totalCount} / {section.maxCapacity || 45}
            </span>
          </div>
          <div className="capacity-bar-container">
            <div
              className="capacity-bar-fill"
              style={{
                width: `${capacityPct}%`,
                background: capacityPct > 90 ? "var(--clr-danger)" : capacityPct > 70 ? "var(--clr-warning)" : "var(--clr-success)",
              }}
            />
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", marginTop: "0.35rem", display: "block" }}>
            {capacityPct}% Classroom capacity
          </span>
        </div>

        {/* Gender Breakdown Card */}
        <div className="card" style={{ padding: "1.25rem", display: "flex", justifyContent: "space-around", alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#60a5fa" }}>{totalMale}</div>
            <span className="gender-pill-male" style={{ marginTop: "0.25rem" }}>
              ♂ Male Learners
            </span>
          </div>
          <div style={{ width: "1px", height: "40px", background: "var(--clr-border)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f472b6" }}>{totalFemale}</div>
            <span className="gender-pill-female" style={{ marginTop: "0.25rem" }}>
              ♀ Female Learners
            </span>
          </div>
        </div>
      </div>

      {/* ── Section Views Tab Switcher ── */}
      <div className="no-print" style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--clr-border)", paddingBottom: "0.5rem" }}>
        <button
          className={`btn btn-sm ${activeTab === "roster" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setActiveTab("roster")}
        >
          👥 Class Learners Roster (SF1)
        </button>
        <button
          className={`btn btn-sm ${activeTab === "schedule" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setActiveTab("schedule")}
        >
          🗓️ Weekly Timetable & Schedule
        </button>
      </div>

      {activeTab === "schedule" ? (
        <SectionScheduleTab section={section} />
      ) : (
        /* ── Official Class Roster Tables (DepEd SF1 Format) ── */
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--clr-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>Official Class Roster</h3>
            <span style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)" }}>
              DepEd Form 1 standard format (segregated by gender, alphabetically sorted)
            </span>
          </div>
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--clr-accent)" }}>
            Total: {totalCount} Students
          </span>
        </div>

        {students.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--clr-text-muted)" }}>
            <p style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              No learners assigned to this section yet.
            </p>
            <p style={{ fontSize: "0.85rem", marginBottom: "1.25rem" }}>
              Enroll students or use the Assign Students button to add learners.
            </p>
            <button
              type="button"
              className="btn btn-primary no-print"
              onClick={() => setShowAssignModal(true)}
            >
              ➕ Assign Students Now
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* ── MALE LEARNERS SECTION ── */}
            <div style={{ background: "rgba(59, 130, 246, 0.05)", padding: "0.6rem 1.25rem", borderBottom: "1px solid var(--clr-border)", fontWeight: 700, fontSize: "0.85rem", color: "#60a5fa" }}>
              ♂ MALE LEARNERS ({maleStudents.length})
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ width: "45px", textAlign: "center" }}>#</th>
                    <th style={{ width: "140px" }}>LRN</th>
                    <th style={{ minWidth: "200px" }}>Learner Full Name</th>
                    <th style={{ width: "110px" }}>Birth Date</th>
                    <th style={{ minWidth: "160px" }}>Guardian / Parent</th>
                    <th style={{ minWidth: "130px" }}>Contact</th>
                    <th className="no-print" style={{ width: "90px", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {maleStudents.map((st, idx) => (
                    <tr key={st.id}>
                      <td style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--clr-text-muted)" }}>
                        {idx + 1}
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.82rem", fontWeight: 600 }}>
                        {st.lrn}
                      </td>
                      <td>
                        <strong style={{ color: "var(--clr-text)" }}>
                          {st.lastName}, {st.firstName} {st.middleName ? `${st.middleName[0]}.` : ""} {st.extName || ""}
                        </strong>
                      </td>
                      <td style={{ fontSize: "0.82rem", color: "var(--clr-text-muted)" }}>
                        {st.birthDate ? new Date(st.birthDate).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {st.guardian ? `${st.guardian.name} (${st.guardian.relationship})` : "—"}
                      </td>
                      <td style={{ fontSize: "0.82rem", color: "var(--clr-text-muted)" }}>
                        {st.guardian?.contactNo || st.contactNo || "—"}
                      </td>
                      <td className="no-print" style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => handleRemoveStudent(st.id, `${st.firstName} ${st.lastName}`)}
                          title="Remove from section"
                          style={{ color: "var(--clr-danger)", background: "none", border: "none", cursor: "pointer", padding: "4px" }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                  {maleStudents.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "1.5rem", color: "var(--clr-text-muted)", fontSize: "0.85rem" }}>
                        No male students in this section.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ── FEMALE LEARNERS SECTION ── */}
            <div style={{ background: "rgba(236, 72, 153, 0.05)", padding: "0.6rem 1.25rem", borderBottom: "1px solid var(--clr-border)", borderTop: "1px solid var(--clr-border)", fontWeight: 700, fontSize: "0.85rem", color: "#f472b6" }}>
              ♀ FEMALE LEARNERS ({femaleStudents.length})
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ width: "45px", textAlign: "center" }}>#</th>
                    <th style={{ width: "140px" }}>LRN</th>
                    <th style={{ minWidth: "200px" }}>Learner Full Name</th>
                    <th style={{ width: "110px" }}>Birth Date</th>
                    <th style={{ minWidth: "160px" }}>Guardian / Parent</th>
                    <th style={{ minWidth: "130px" }}>Contact</th>
                    <th className="no-print" style={{ width: "90px", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {femaleStudents.map((st, idx) => (
                    <tr key={st.id}>
                      <td style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--clr-text-muted)" }}>
                        {idx + 1}
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.82rem", fontWeight: 600 }}>
                        {st.lrn}
                      </td>
                      <td>
                        <strong style={{ color: "var(--clr-text)" }}>
                          {st.lastName}, {st.firstName} {st.middleName ? `${st.middleName[0]}.` : ""} {st.extName || ""}
                        </strong>
                      </td>
                      <td style={{ fontSize: "0.82rem", color: "var(--clr-text-muted)" }}>
                        {st.birthDate ? new Date(st.birthDate).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {st.guardian ? `${st.guardian.name} (${st.guardian.relationship})` : "—"}
                      </td>
                      <td style={{ fontSize: "0.82rem", color: "var(--clr-text-muted)" }}>
                        {st.guardian?.contactNo || st.contactNo || "—"}
                      </td>
                      <td className="no-print" style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => handleRemoveStudent(st.id, `${st.firstName} ${st.lastName}`)}
                          title="Remove from section"
                          style={{ color: "var(--clr-danger)", background: "none", border: "none", cursor: "pointer", padding: "4px" }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                  {femaleStudents.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "1.5rem", color: "var(--clr-text-muted)", fontSize: "0.85rem" }}>
                        No female students in this section.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      )}

      {/* ── Assign Students Modal ── */}
      {showAssignModal && (
        <AssignStudentsModal
          section={section}
          onClose={() => setShowAssignModal(false)}
          onAssigned={() => {
            setShowAssignModal(false);
            fetchRoster();
          }}
        />
      )}

      {/* ── Edit Section Modal ── */}
      {showEditModal && (
        <CreateSectionModal
          section={section}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false);
            fetchRoster();
          }}
        />
      )}
    </div>
  );
}
