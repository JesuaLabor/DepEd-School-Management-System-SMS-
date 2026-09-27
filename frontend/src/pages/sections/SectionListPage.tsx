import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "@/services/api";
import type { SectionWithAdviser } from "@/types";
import CreateSectionModal from "./CreateSectionModal";

const GRADE_LEVELS = [7, 8, 9, 10, 11, 12];

export default function SectionListPage() {
  const [sections, setSections]       = useState<SectionWithAdviser[]>([]);
  const [gradeFilter, setGradeFilter] = useState<string>(""); // empty = all
  const [schoolYear, setSchoolYear]   = useState<string>("2024-2025");
  const [search, setSearch]           = useState<string>("");
  const [viewMode, setViewMode]       = useState<"cards" | "table">("cards");

  const [loading, setLoading]         = useState<boolean>(true);
  const [error, setError]             = useState<string | null>(null);

  // Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingSection, setEditingSection]   = useState<SectionWithAdviser | null>(null);

  const fetchSections = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.sections.list({
        schoolYear,
        gradeLevel: gradeFilter ? Number(gradeFilter) : undefined,
        search: search.trim() || undefined,
      });
      setSections(res.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load sections.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolYear, gradeFilter, search]);

  // Overall KPI metrics
  const stats = useMemo(() => {
    const totalSections = sections.length;
    let totalLearners = 0;
    let withAdviser = 0;

    sections.forEach((s) => {
      totalLearners += s.studentCount || 0;
      if (s.adviser) withAdviser++;
    });

    const avgSize = totalSections > 0 ? Math.round(totalLearners / totalSections) : 0;
    return { totalSections, totalLearners, withAdviser, avgSize };
  }, [sections]);

  const handleEdit = (sec: SectionWithAdviser, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingSection(sec);
    setShowCreateModal(true);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Page Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--clr-text-muted)", marginBottom: "0.25rem" }}>
            <span>School Operations</span>
            <span>/</span>
            <span style={{ color: "var(--clr-text)" }}>Section Management</span>
          </div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, color: "var(--clr-text)" }}>
            Class & Section Management
          </h1>
          <p style={{ margin: "0.25rem 0 0 0", color: "var(--clr-text-muted)", fontSize: "0.9rem" }}>
            Manage classroom advisory sections, teacher advisers, capacity limits, and learner sectioning.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setEditingSection(null);
            setShowCreateModal(true);
          }}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 1.25rem" }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Create New Section
        </button>
      </div>

      {/* ── Summary Stats ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        <div className="attendance-stat-box">
          <div className="count" style={{ color: "var(--clr-primary)" }}>{stats.totalSections}</div>
          <div>
            <div className="label">Total Sections</div>
            <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>Active classes</span>
          </div>
        </div>

        <div className="attendance-stat-box">
          <div className="count" style={{ color: "var(--clr-success)" }}>{stats.totalLearners}</div>
          <div>
            <div className="label">Sectioned Students</div>
            <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>Enrolled in sections</span>
          </div>
        </div>

        <div className="attendance-stat-box">
          <div className="count" style={{ color: "var(--clr-accent)" }}>{stats.withAdviser}</div>
          <div>
            <div className="label">With Adviser</div>
            <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>
              {stats.totalSections > 0 ? Math.round((stats.withAdviser / stats.totalSections) * 100) : 0}% assigned
            </span>
          </div>
        </div>

        <div className="attendance-stat-box">
          <div className="count" style={{ color: "var(--clr-text)" }}>{stats.avgSize}</div>
          <div>
            <div className="label">Average Class Size</div>
            <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>Max norm: 45</span>
          </div>
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "1rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", flex: 1 }}>
            <div style={{ minWidth: "220px", flex: 1 }}>
              <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>Search Section</label>
              <input
                type="text"
                className="form-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search section name..."
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ minWidth: "160px" }}>
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

            <div style={{ minWidth: "170px" }}>
              <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>Grade Level</label>
              <select
                className="form-input"
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="">All Grades (7-12)</option>
                {GRADE_LEVELS.map((g) => (
                  <option key={g} value={g}>
                    Grade {g} {g >= 11 ? "(SHS)" : "(JHS)"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* View mode toggle */}
          <div style={{ display: "flex", gap: "0.35rem", background: "var(--clr-surface-2)", padding: "3px", borderRadius: "var(--radius-sm)" }}>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className="btn"
              style={{
                padding: "0.35rem 0.65rem",
                fontSize: "0.75rem",
                background: viewMode === "cards" ? "var(--clr-primary)" : "transparent",
                color: viewMode === "cards" ? "#fff" : "var(--clr-text-muted)",
                border: "none",
              }}
            >
              Cards View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className="btn"
              style={{
                padding: "0.35rem 0.65rem",
                fontSize: "0.75rem",
                background: viewMode === "table" ? "var(--clr-primary)" : "transparent",
                color: viewMode === "table" ? "#fff" : "var(--clr-text-muted)",
                border: "none",
              }}
            >
              Table View
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          ⚠️ {error}
        </div>
      )}

      {/* ── Content View ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--clr-text-muted)" }}>
          <div className="spinner" style={{ margin: "0 auto 1rem" }} />
          Loading class sections...
        </div>
      ) : sections.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--clr-text-muted)" }}>
          <p style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            No sections found matching your filters.
          </p>
          <p style={{ fontSize: "0.85rem", marginBottom: "1.5rem" }}>
            Create your first class section for School Year {schoolYear}.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditingSection(null);
              setShowCreateModal(true);
            }}
          >
            ➕ Create First Section
          </button>
        </div>
      ) : viewMode === "cards" ? (
        /* ── Grid Cards View ── */
        <div className="section-grid">
          {sections.map((sec) => {
            const capacityPct = Math.min(100, Math.round((sec.studentCount / (sec.maxCapacity || 45)) * 100));

            return (
              <div key={sec.id} className="section-card">
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span className="badge badge-info" style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}>
                        Grade {sec.gradeLevel}
                      </span>
                      {sec.strand && (
                        <span className="badge badge-default" style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem" }}>
                          {sec.strand.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleEdit(sec, e)}
                      style={{ background: "none", border: "none", color: "var(--clr-text-muted)", cursor: "pointer", fontSize: "0.85rem" }}
                      title="Edit Section"
                    >
                      ✏️
                    </button>
                  </div>

                  <h3 style={{ margin: "0.25rem 0", fontSize: "1.25rem", fontWeight: 700, color: "var(--clr-text)" }}>
                    Section {sec.name}
                  </h3>

                  <div style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span>{sec.room || "Room unassigned"}</span>
                    <span>•</span>
                    <span>SY {sec.schoolYear}</span>
                  </div>

                  {/* Adviser */}
                  <div style={{ margin: "0.85rem 0", padding: "0.6rem 0.75rem", background: "var(--clr-surface-2)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span style={{ fontSize: "1rem" }}>👨‍🏫</span>
                    <div style={{ overflow: "hidden" }}>
                      <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "var(--clr-text-muted)", fontWeight: 600 }}>
                        Class Adviser
                      </div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: sec.adviser ? "var(--clr-text)" : "var(--clr-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {sec.adviser ? `${sec.adviser.lastName}, ${sec.adviser.firstName}` : "Unassigned"}
                      </div>
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  <div style={{ marginTop: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                      <span style={{ color: "var(--clr-text-muted)" }}>Enrolled Capacity</span>
                      <strong style={{ color: capacityPct > 90 ? "var(--clr-danger)" : "var(--clr-text)" }}>
                        {sec.studentCount} / {sec.maxCapacity || 45} ({capacityPct}%)
                      </strong>
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
                  </div>
                </div>

                {/* Card Footer: Gender tally & Roster Link */}
                <div style={{ marginTop: "1rem", paddingTop: "0.85rem", borderTop: "1px solid var(--clr-border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <span className="gender-pill-male" style={{ fontSize: "0.7rem" }}>
                      ♂ {sec.maleCount || 0}
                    </span>
                    <span className="gender-pill-female" style={{ fontSize: "0.7rem" }}>
                      ♀ {sec.femaleCount || 0}
                    </span>
                  </div>

                  <Link
                    to={`/sections/${sec.id}`}
                    className="btn btn-secondary"
                    style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
                  >
                    View Roster →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Dense Table View ── */
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ width: "90px" }}>Grade</th>
                  <th>Section Name</th>
                  <th>Room</th>
                  <th>Class Adviser</th>
                  <th style={{ width: "120px" }}>Capacity</th>
                  <th style={{ width: "140px" }}>Gender Breakdown</th>
                  <th style={{ width: "130px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((sec) => (
                  <tr key={sec.id}>
                    <td>
                      <span className="badge badge-info" style={{ fontSize: "0.75rem" }}>
                        Grade {sec.gradeLevel}
                      </span>
                    </td>
                    <td>
                      <strong>Section {sec.name}</strong>
                      {sec.strand && (
                        <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", display: "block" }}>
                          {sec.strand.toUpperCase()} {sec.track ? `· ${sec.track}` : ""}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: "0.85rem", color: "var(--clr-text-muted)" }}>
                      {sec.room || "—"}
                    </td>
                    <td>
                      {sec.adviser ? (
                        <div>
                          <span style={{ fontWeight: 600 }}>{sec.adviser.lastName}, {sec.adviser.firstName}</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", display: "block" }}>{sec.adviser.email}</span>
                        </div>
                      ) : (
                        <span style={{ color: "var(--clr-text-muted)", fontSize: "0.8rem" }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ fontSize: "0.85rem" }}>
                      <strong>{sec.studentCount}</strong> / {sec.maxCapacity || 45}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.35rem" }}>
                        <span className="gender-pill-male" style={{ fontSize: "0.68rem" }}>
                          ♂ {sec.maleCount || 0}
                        </span>
                        <span className="gender-pill-female" style={{ fontSize: "0.68rem" }}>
                          ♀ {sec.femaleCount || 0}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        to={`/sections/${sec.id}`}
                        className="btn btn-secondary"
                        style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem", marginRight: "0.35rem" }}
                      >
                        Roster
                      </Link>
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={(e) => handleEdit(sec, e)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--clr-text-muted)" }}
                      >
                        ✏️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {showCreateModal && (
        <CreateSectionModal
          section={editingSection}
          defaultGradeLevel={gradeFilter ? Number(gradeFilter) : 7}
          defaultSchoolYear={schoolYear}
          onClose={() => {
            setShowCreateModal(false);
            setEditingSection(null);
          }}
          onSaved={() => {
            setShowCreateModal(false);
            setEditingSection(null);
            fetchSections();
          }}
        />
      )}
    </div>
  );
}
