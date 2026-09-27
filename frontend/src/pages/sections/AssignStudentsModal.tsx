import { useState, useEffect } from "react";
import { api } from "@/services/api";
import type { SectionWithAdviser, Student } from "@/types";

interface Props {
  section: SectionWithAdviser;
  onClose: () => void;
  onAssigned: () => void;
}

export default function AssignStudentsModal({ section, onClose, onAssigned }: Props) {
  const [unassigned, setUnassigned]   = useState<Student[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch]           = useState<string>("");
  const [loading, setLoading]         = useState<boolean>(true);
  const [saving, setSaving]           = useState<boolean>(false);
  const [error, setError]             = useState<string | null>(null);

  const availableSlots = Math.max(0, section.maxCapacity - section.studentCount);

  // Fetch unassigned students
  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.sections.unassignedStudents({
        gradeLevel: section.gradeLevel,
        schoolYear: section.schoolYear,
        search: search.trim() || undefined,
      });
      setUnassigned(res.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load unassigned students.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Toggle selection
  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle all
  const handleToggleAll = () => {
    if (selectedIds.size === unassigned.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unassigned.map((s) => s.id)));
    }
  };

  // Submit assignment
  const handleAssign = async () => {
    if (selectedIds.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      await api.sections.assignStudents(section.id, Array.from(selectedIds));
      onAssigned();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to assign students to section.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const isOverCapacity = selectedIds.size > availableSlots;

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: "720px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        {/* ── Modal Header ── */}
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
              Assign Learners to {section.name}
            </h3>
            <span style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)" }}>
              Grade {section.gradeLevel} · School Year {section.schoolYear} · Current: {section.studentCount} / {section.maxCapacity} ({availableSlots} slots free)
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--clr-text-muted)", fontSize: "1.2rem", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        {/* ── Search & Filter ── */}
        <div style={{ padding: "1rem 1.25rem 0.5rem 1.25rem", borderBottom: "1px solid var(--clr-border-soft)" }}>
          <input
            type="text"
            className="form-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search unassigned learners by name or LRN..."
            style={{ width: "100%", fontSize: "0.875rem" }}
          />
        </div>

        {/* ── Alerts ── */}
        {error && (
          <div className="alert alert-error" style={{ margin: "0.75rem 1.25rem" }}>
            ⚠️ {error}
          </div>
        )}

        {isOverCapacity && (
          <div className="alert alert-warning" style={{ margin: "0.75rem 1.25rem" }}>
            ⚠️ You selected {selectedIds.size} students, which exceeds available capacity ({availableSlots} free slots).
          </div>
        )}

        {/* ── Student List ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 1.25rem" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--clr-text-muted)" }}>
              <div className="spinner" style={{ margin: "0 auto 1rem" }} />
              Finding unassigned learners in Grade {section.gradeLevel}...
            </div>
          ) : unassigned.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--clr-text-muted)" }}>
              <p style={{ fontSize: "1rem", fontWeight: 500, marginBottom: "0.25rem" }}>
                No unassigned students found in Grade {section.gradeLevel}.
              </p>
              <p style={{ fontSize: "0.8rem" }}>
                All enrolled students for this grade have already been assigned to sections.
              </p>
            </div>
          ) : (
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "0.5rem" }}>
              <thead>
                <tr>
                  <th style={{ width: "40px", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size === unassigned.length && unassigned.length > 0}
                      onChange={handleToggleAll}
                      style={{ cursor: "pointer" }}
                    />
                  </th>
                  <th>Learner Details</th>
                  <th style={{ width: "100px" }}>Sex</th>
                  <th style={{ width: "130px" }}>Birth Date</th>
                </tr>
              </thead>
              <tbody>
                {unassigned.map((st) => {
                  const isChecked = selectedIds.has(st.id);
                  return (
                    <tr
                      key={st.id}
                      onClick={() => handleToggle(st.id)}
                      style={{
                        cursor: "pointer",
                        background: isChecked ? "rgba(37, 99, 235, 0.08)" : undefined,
                      }}
                    >
                      <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggle(st.id)}
                          style={{ cursor: "pointer" }}
                        />
                      </td>

                      <td>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 600, color: "var(--clr-text)" }}>
                            {st.lastName}, {st.firstName} {st.middleName || ""}
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
                            background: st.sex?.toLowerCase() === "female" ? "rgba(236, 72, 153, 0.15)" : "rgba(59, 130, 246, 0.15)",
                            color: st.sex?.toLowerCase() === "female" ? "#f472b6" : "#60a5fa",
                          }}
                        >
                          {st.sex}
                        </span>
                      </td>

                      <td style={{ fontSize: "0.85rem", color: "var(--clr-text-muted)" }}>
                        {st.birthDate ? new Date(st.birthDate).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderTop: "1px solid var(--clr-border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "0.85rem", color: "var(--clr-text-muted)" }}>
            <strong>{selectedIds.size}</strong> learners selected
          </span>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAssign}
              disabled={saving || selectedIds.size === 0}
            >
              {saving ? "Assigning Learners..." : `Assign ${selectedIds.size} Learners`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
