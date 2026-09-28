import { useState, useEffect, useRef } from "react";
import { api } from "@/services/api";
import type { SchoolFormSF10, Student } from "@/types";

export default function SF10Viewer() {
  const [query, setQuery]           = useState<string>("");
  const [results, setResults]       = useState<Student[]>([]);
  const [searching, setSearching]   = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const pickerRef                   = useRef<HTMLDivElement>(null);

  const [studentId, setStudentId]   = useState<string>("");
  const [sf10, setSf10]             = useState<SchoolFormSF10 | null>(null);
  const [loading, setLoading]       = useState<boolean>(false);
  const [error, setError]           = useState<string | null>(null);

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

  // Debounced search
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

  // Load SF10
  const fetchSF10 = async (sid: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.schoolForms.sf10(sid);
      setSf10(res);
      setQuery(`${res.student.lastName}, ${res.student.firstName}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load SF10 transcript.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) {
      fetchSF10(studentId);
    }
  }, [studentId]);

  const handleSelectStudent = (st: Student) => {
    setStudentId(st.id);
    setShowResults(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Toolbar ── */}
      <div className="card no-print" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end", justifyContent: "space-between" }}>
          {/* Student Search Picker */}
          <div ref={pickerRef} className="student-picker" style={{ minWidth: "320px", flex: 1 }}>
            <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>Select Learner (LRN or Name)</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="form-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => { if (results.length > 0) setShowResults(true); }}
                placeholder="Search learner for permanent record (Form 137)..."
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

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.print()}
            disabled={!sf10}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            🖨️ Print Permanent Record (SF10)
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error no-print">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--clr-text-muted)" }}>
          <div className="spinner" style={{ margin: "0 auto 1rem" }} />
          Retrieving Learner Permanent Academic Record (SF10)...
        </div>
      ) : !sf10 ? (
        <div className="card no-print" style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--clr-text-muted)" }}>
          <p style={{ fontSize: "1.1rem", fontWeight: 600 }}>Please choose a learner above to preview their SF10 permanent record.</p>
        </div>
      ) : (
        /* ── Official DepEd SF10 Form Layout ── */
        <div className="card sf9-container" style={{ maxWidth: "950px", padding: "2rem" }}>
          {/* Header */}
          <div style={{ textAlign: "center", borderBottom: "2px solid var(--clr-border)", paddingBottom: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--clr-text-muted)", fontWeight: 600 }}>
              Republic of the Philippines · Department of Education
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--clr-text-muted)", marginTop: "0.15rem" }}>
              Region: <strong>National Capital Region (NCR)</strong> · Division: <strong>City Schools Division of Manila</strong> · School ID: <strong>301234</strong>
            </div>
            <h2 style={{ margin: "0.35rem 0 0.15rem 0", fontSize: "1.3rem", fontWeight: 800 }}>
              LEARNER'S PERMANENT ACADEMIC RECORD (SF10)
            </h2>
            <div style={{ fontSize: "0.78rem", color: "var(--clr-text-muted)" }}>
              Rizal National High School · (Formerly Form 137 · DepEd Order No. 58, s. 2017)
            </div>
          </div>

          {/* Learner Info */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "0.75rem 1.25rem",
              background: "var(--clr-surface-2)",
              padding: "1rem 1.25rem",
              borderRadius: "var(--radius)",
              marginBottom: "1.75rem",
              border: "1px solid var(--clr-border-soft)",
              fontSize: "0.85rem",
            }}
          >
            <div>
              <span style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "var(--clr-text-muted)", display: "block" }}>Learner Full Name</span>
              <strong>{sf10.student.lastName}, {sf10.student.firstName} {sf10.student.middleName || ""} {sf10.student.extName || ""}</strong>
            </div>

            <div>
              <span style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "var(--clr-text-muted)", display: "block" }}>Learner Reference Number (LRN)</span>
              <strong style={{ fontFamily: "monospace" }}>{sf10.student.lrn}</strong>
            </div>

            <div>
              <span style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "var(--clr-text-muted)", display: "block" }}>Birth Date / Sex</span>
              <span style={{ textTransform: "capitalize" }}>{sf10.student.birthDate ? new Date(sf10.student.birthDate).toLocaleDateString() : "—"} · {sf10.student.sex}</span>
            </div>

            <div>
              <span style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "var(--clr-text-muted)", display: "block" }}>Current Grade Level</span>
              <strong>Grade {sf10.currentGrade} {sf10.student.strand ? `(${sf10.student.strand.toUpperCase()})` : ""}</strong>
            </div>
          </div>

          {/* ── Multi-Year Scholastic History ── */}
          <h4 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: 700 }}>
            SCHOLASTIC RECORD ACROSS GRADE LEVELS
          </h4>

          {sf10.scholasticHistory.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--clr-text-muted)", background: "var(--clr-surface-2)", borderRadius: "var(--radius)" }}>
              No finalized grades recorded yet for this learner.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
              {sf10.scholasticHistory.map((rec) => (
                <div key={`${rec.schoolYear}-${rec.gradeLevel}`} style={{ border: "1px solid var(--clr-border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                  {/* Record Header */}
                  <div
                    style={{
                      background: "var(--clr-surface-2)",
                      padding: "0.75rem 1.25rem",
                      borderBottom: "1px solid var(--clr-border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    <div>
                      <strong style={{ color: "var(--clr-accent)", fontSize: "0.95rem" }}>
                        GRADE {rec.gradeLevel}
                      </strong>
                      <span style={{ color: "var(--clr-text-muted)", marginLeft: "0.5rem" }}>
                        · Section: {rec.sectionName} · School Year: {rec.schoolYear}
                      </span>
                    </div>

                    <div style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)" }}>
                      Adviser: <strong>{rec.adviserName}</strong>
                    </div>
                  </div>

                  {/* Grades Table */}
                  <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                    <thead>
                      <tr>
                        <th>Learning Areas</th>
                        <th style={{ width: "120px", textAlign: "center" }}>Final Rating</th>
                        <th style={{ width: "130px", textAlign: "center" }}>Action Taken</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rec.grades.map((g) => (
                        <tr key={g.id}>
                          <td><strong>{g.subjectName}</strong></td>
                          <td style={{ textAlign: "center", fontWeight: 700 }}>
                            {g.finalGrade !== undefined && g.finalGrade !== null ? g.finalGrade : "—"}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {g.remarks === "Passed" ? (
                              <span className="badge badge-success" style={{ fontSize: "0.7rem" }}>Passed</span>
                            ) : g.remarks === "Failed" ? (
                              <span className="badge badge-error" style={{ fontSize: "0.7rem" }}>Failed</span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}

                      {/* General Average Row */}
                      <tr style={{ background: "rgba(37, 99, 235, 0.06)", borderTop: "2px solid var(--clr-border)" }}>
                        <td><strong style={{ fontSize: "0.85rem" }}>GENERAL AVERAGE</strong></td>
                        <td style={{ textAlign: "center", fontSize: "1rem", fontWeight: 800, color: "var(--clr-primary)" }}>
                          {rec.generalAverage !== undefined && rec.generalAverage !== null ? rec.generalAverage : "—"}
                        </td>
                        <td style={{ textAlign: "center", fontWeight: 700, fontSize: "0.75rem", color: "var(--clr-success)" }}>
                          {rec.remarks || "—"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* ── Certification of Transfer & Graduation ── */}
          <div style={{ marginTop: "2.5rem", borderTop: "2px solid var(--clr-border)", paddingTop: "1.5rem" }}>
            <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", fontWeight: 700 }}>
              CERTIFICATION OF SCHOLASTIC RECORD
            </h4>
            <p style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)", lineHeight: 1.5, margin: 0 }}>
              I hereby certify that this is a true and correct record of the scholastic achievements of <strong>{sf10.student.firstName} {sf10.student.lastName}</strong> with LRN <strong>{sf10.student.lrn}</strong>. He/she is eligible for admission to the next curriculum level.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", marginTop: "2.5rem" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ borderBottom: "1px solid var(--clr-text)", height: "35px", marginBottom: "0.4rem" }} />
                <strong style={{ fontSize: "0.85rem" }}>School Registrar</strong>
                <div style={{ fontSize: "0.72rem", color: "var(--clr-text-muted)" }}>Signature over Printed Name</div>
              </div>

              <div style={{ textAlign: "center" }}>
                <div style={{ borderBottom: "1px solid var(--clr-text)", height: "35px", marginBottom: "0.4rem" }} />
                <strong style={{ fontSize: "0.85rem" }}>School Principal / Head</strong>
                <div style={{ fontSize: "0.72rem", color: "var(--clr-text-muted)" }}>Signature over Printed Name</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
