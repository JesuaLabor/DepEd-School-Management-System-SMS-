import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "@/services/api";
import type { LearnerSF9, Student } from "@/types";

export default function StudentSF9Page() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStudentId = searchParams.get("studentId");

  // Search picker state
  const [query, setQuery]           = useState<string>("");
  const [results, setResults]       = useState<Student[]>([]);
  const [searching, setSearching]   = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const pickerRef                   = useRef<HTMLDivElement>(null);

  const [studentId, setStudentId]   = useState<string>(urlStudentId || "");
  const [schoolYear, setSchoolYear] = useState<string>("2024-2025");
  const [sf9, setSf9]               = useState<LearnerSF9 | null>(null);

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

  // Load SF9 when studentId changes
  const fetchSF9 = async (sid: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.grades.studentSF9(sid, schoolYear);
      setSf9(res);
      setQuery(`${res.student.lastName}, ${res.student.firstName}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load SF9 report card.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) {
      fetchSF9(studentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, schoolYear]);

  const handleSelectStudent = (st: Student) => {
    setStudentId(st.id);
    setSearchParams({ studentId: st.id });
    setShowResults(false);
  };

  const descriptorClass = (desc?: string) => {
    if (!desc) return "";
    const lower = desc.toLowerCase();
    if (lower.includes("outstanding")) return "outstanding";
    if (lower.includes("very satisfactory")) return "very-satisfactory";
    if (lower.includes("satisfactory")) return "satisfactory";
    if (lower.includes("fairly")) return "fairly-satisfactory";
    return "failed";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Top Header Toolbar ── */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--clr-text-muted)", marginBottom: "0.25rem" }}>
            <Link to="/grading" style={{ color: "inherit" }}>
              Grading Sheet
            </Link>
            <span>/</span>
            <span style={{ color: "var(--clr-text)" }}>Learner Progress Report Card (SF9)</span>
          </div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, color: "var(--clr-text)" }}>
            DepEd Form 9 (SF9)
          </h1>
          <p style={{ margin: "0.25rem 0 0 0", color: "var(--clr-text-muted)", fontSize: "0.9rem" }}>
            Official DepEd Learner Progress Report Card for Junior and Senior High School.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.print()}
            disabled={!sf9}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            🖨️ Print SF9 Card
          </button>
          <Link to="/grading" className="btn btn-secondary">
            ← Back to Grading Sheet
          </Link>
        </div>
      </div>

      {/* ── Student Selector Toolbar ── */}
      <div className="card no-print" style={{ padding: "1.25rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1.5fr) 180px", gap: "1rem", alignItems: "flex-end" }}>
          {/* Student Search Picker */}
          <div ref={pickerRef} className="student-picker">
            <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>Select Learner (LRN or Name)</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="form-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => { if (results.length > 0) setShowResults(true); }}
                placeholder="Type learner name or 12-digit LRN..."
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
        </div>
      </div>

      {error && (
        <div className="alert alert-error no-print">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "5rem", color: "var(--clr-text-muted)" }}>
          <div className="spinner" style={{ margin: "0 auto 1rem" }} />
          Generating Learner SF9 Report Card...
        </div>
      ) : !sf9 ? (
        <div className="card no-print" style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--clr-text-muted)" }}>
          <p style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            No learner selected.
          </p>
          <p style={{ fontSize: "0.85rem" }}>
            Use the search box above to choose a student to generate their official SF9 Report Card.
          </p>
        </div>
      ) : (
        /* ── Official DepEd School Form 9 (SF9) Card ── */
        <div className="sf9-container card">
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1.25rem", borderBottom: "2px solid var(--clr-border)", paddingBottom: "1.25rem", marginBottom: "1.5rem" }}>
            <img
              src="/knhs_logo.png"
              alt="KNHS Official Logo"
              style={{ width: "64px", height: "64px", objectFit: "contain", flexShrink: 0 }}
            />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--clr-text-muted)", fontWeight: 600 }}>
                Republic of the Philippines · Department of Education
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--clr-text-muted)", marginTop: "0.15rem" }}>
                Region: <strong>Region X (Northern Mindanao)</strong> · Division: <strong>Division of Bukidnon</strong> · Kalilangan, Bukidnon
              </div>
              <h2 style={{ margin: "0.35rem 0 0.15rem 0", fontSize: "1.35rem", fontWeight: 800, color: "var(--clr-text)" }}>
                PROGRESS REPORT CARD (SF9)
              </h2>
              <div style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)" }}>
                K to 12 Basic Education Curriculum · DepEd Order No. 8, s. 2015 · Kalilangan National High School
              </div>
            </div>
            <img
              src="/knhs_logo.png"
              alt=""
              aria-hidden="true"
              style={{ width: "64px", height: "64px", objectFit: "contain", flexShrink: 0, opacity: 0 }}
            />
          </div>

          {/* Learner Info Box */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "0.75rem 1.5rem",
              background: "var(--clr-surface-2)",
              padding: "1rem 1.25rem",
              borderRadius: "var(--radius)",
              marginBottom: "1.5rem",
              border: "1px solid var(--clr-border-soft)",
            }}
          >
            <div>
              <span style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "var(--clr-text-muted)", display: "block" }}>Learner Full Name</span>
              <strong style={{ fontSize: "0.95rem" }}>{sf9.student.lastName}, {sf9.student.firstName} {sf9.student.middleName || ""} {sf9.student.extName || ""}</strong>
            </div>

            <div>
              <span style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "var(--clr-text-muted)", display: "block" }}>Learner Reference Number (LRN)</span>
              <strong style={{ fontFamily: "monospace", fontSize: "0.95rem" }}>{sf9.student.lrn}</strong>
            </div>

            <div>
              <span style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "var(--clr-text-muted)", display: "block" }}>Grade & Section</span>
              <strong>Grade {sf9.gradeLevel} — {sf9.section.name || "Unassigned"}</strong>
            </div>

            <div>
              <span style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "var(--clr-text-muted)", display: "block" }}>School Year / Track</span>
              <strong>SY {sf9.schoolYear} {sf9.student.strand ? `(${sf9.student.strand.toUpperCase()})` : ""}</strong>
            </div>

            <div>
              <span style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "var(--clr-text-muted)", display: "block" }}>Sex / Birth Date</span>
              <span style={{ textTransform: "capitalize" }}>{sf9.student.sex} · {sf9.student.birthDate ? new Date(sf9.student.birthDate).toLocaleDateString() : "—"}</span>
            </div>

            <div>
              <span style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "var(--clr-text-muted)", display: "block" }}>Class Adviser</span>
              <strong>{sf9.section.adviser ? `${sf9.section.adviser.lastName}, ${sf9.section.adviser.firstName}` : "Unassigned"}</strong>
            </div>
          </div>

          {/* ── PART A: REPORT ON LEARNING AREAS ── */}
          <div style={{ marginBottom: "2rem" }}>
            <h4 style={{ margin: "0 0 0.6rem 0", fontSize: "0.95rem", fontWeight: 700, color: "var(--clr-text)" }}>
              REPORT ON LEARNING AREAS (ACADEMIC PERFORMANCE)
            </h4>

            <div style={{ overflowX: "auto" }}>
              <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: "240px" }}>Learning Areas</th>
                    <th style={{ width: "70px", textAlign: "center" }}>1</th>
                    <th style={{ width: "70px", textAlign: "center" }}>2</th>
                    <th style={{ width: "70px", textAlign: "center" }}>3</th>
                    <th style={{ width: "70px", textAlign: "center" }}>4</th>
                    <th style={{ width: "95px", textAlign: "center" }}>Final Rating</th>
                    <th style={{ width: "100px", textAlign: "center" }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {sf9.grades.map((g) => (
                    <tr key={g.id}>
                      <td>
                        <strong>{g.subjectName}</strong>
                      </td>
                      <td style={{ textAlign: "center" }}>{g.q1 !== undefined && g.q1 !== null ? g.q1 : "—"}</td>
                      <td style={{ textAlign: "center" }}>{g.q2 !== undefined && g.q2 !== null ? g.q2 : "—"}</td>
                      <td style={{ textAlign: "center" }}>{g.q3 !== undefined && g.q3 !== null ? g.q3 : "—"}</td>
                      <td style={{ textAlign: "center" }}>{g.q4 !== undefined && g.q4 !== null ? g.q4 : "—"}</td>
                      <td style={{ textAlign: "center", fontWeight: 800 }}>{g.finalGrade !== undefined && g.finalGrade !== null ? g.finalGrade : "—"}</td>
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

                  {/* General Average Footer Row */}
                  <tr style={{ background: "rgba(37, 99, 235, 0.08)", borderTop: "2px solid var(--clr-border)" }}>
                    <td>
                      <strong style={{ fontSize: "0.95rem" }}>GENERAL AVERAGE</strong>
                    </td>
                    <td colSpan={4} />
                    <td style={{ textAlign: "center", fontSize: "1.1rem", fontWeight: 900, color: "var(--clr-primary)" }}>
                      {sf9.generalAverage !== undefined && sf9.generalAverage !== null ? sf9.generalAverage : "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {sf9.remarks === "Promoted" ? (
                        <span className="badge badge-success" style={{ fontSize: "0.75rem", fontWeight: 700 }}>PROMOTED</span>
                      ) : sf9.remarks === "Retained" ? (
                        <span className="badge badge-error" style={{ fontSize: "0.75rem", fontWeight: 700 }}>RETAINED</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* General Average Banner & Descriptors */}
            {sf9.generalAverage && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--clr-text-muted)" }}>DepEd Descriptor:</span>
                  <span className={`descriptor-pill ${descriptorClass(sf9.descriptor)}`}>
                    ★ {sf9.descriptor}
                  </span>
                </div>

                <div style={{ fontSize: "0.85rem" }}>
                  Eligibility for Admission: <strong>Eligible for Grade {sf9.gradeLevel + 1}</strong>
                </div>
              </div>
            )}
          </div>

          {/* ── PART B: OBSERVED VALUES ── */}
          <div style={{ marginBottom: "2rem" }}>
            <h4 style={{ margin: "0 0 0.6rem 0", fontSize: "0.95rem", fontWeight: 700, color: "var(--clr-text)" }}>
              REPORT ON LEARNER'S OBSERVED VALUES (CORE VALUES)
            </h4>

            <div style={{ overflowX: "auto" }}>
              <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr>
                    <th style={{ width: "130px" }}>Core Values</th>
                    <th>Behavior Statements</th>
                    <th style={{ width: "50px", textAlign: "center" }}>Q1</th>
                    <th style={{ width: "50px", textAlign: "center" }}>Q2</th>
                    <th style={{ width: "50px", textAlign: "center" }}>Q3</th>
                    <th style={{ width: "50px", textAlign: "center" }}>Q4</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td rowSpan={2} style={{ fontWeight: 700 }}>1. Maka-Diyos</td>
                    <td>Expresses one's spiritual beliefs while respecting the beliefs of others</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                  </tr>
                  <tr>
                    <td>Shows adherence to ethical principles by upholding truth and honesty</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                  </tr>
                  <tr>
                    <td rowSpan={2} style={{ fontWeight: 700 }}>2. Makatao</td>
                    <td>Is sensitive to individual, social, and cultural differences</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                  </tr>
                  <tr>
                    <td>Demonstrates solidarity and cooperation in the school community</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>3. Makakalikasan</td>
                    <td>Cares for the environment and utilizes resources wisely and judiciously</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                  </tr>
                  <tr>
                    <td rowSpan={2} style={{ fontWeight: 700 }}>4. Makabansa</td>
                    <td>Demonstrates pride in being a Filipino; exercises rights and duties responsibly</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                  </tr>
                  <tr>
                    <td>Demonstrates appropriate behavior in carrying out school and community activities</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                    <td style={{ textAlign: "center" }}>AO</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ fontSize: "0.72rem", color: "var(--clr-text-muted)", marginTop: "0.4rem" }}>
              Marking Scale: <strong>AO</strong> - Always Observed · <strong>SO</strong> - Sometimes Observed · <strong>RO</strong> - Rarely Observed · <strong>NO</strong> - Not Observed
            </div>
          </div>

          {/* ── PART C: ATTENDANCE RECORD ── */}
          <div style={{ marginBottom: "2rem" }}>
            <h4 style={{ margin: "0 0 0.6rem 0", fontSize: "0.95rem", fontWeight: 700, color: "var(--clr-text)" }}>
              REPORT ON ATTENDANCE
            </h4>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem" }}>
              <div style={{ background: "var(--clr-surface-2)", padding: "0.75rem 1rem", borderRadius: "var(--radius)", textAlign: "center" }}>
                <span style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "var(--clr-text-muted)" }}>Days of School</span>
                <div style={{ fontSize: "1.25rem", fontWeight: 800 }}>{sf9.attendance.total || 0}</div>
              </div>

              <div style={{ background: "var(--clr-surface-2)", padding: "0.75rem 1rem", borderRadius: "var(--radius)", textAlign: "center" }}>
                <span style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "var(--clr-text-muted)" }}>Days Present</span>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--clr-success)" }}>{sf9.attendance.present || 0}</div>
              </div>

              <div style={{ background: "var(--clr-surface-2)", padding: "0.75rem 1rem", borderRadius: "var(--radius)", textAlign: "center" }}>
                <span style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "var(--clr-text-muted)" }}>Days Absent</span>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--clr-danger)" }}>{sf9.attendance.absent || 0}</div>
              </div>

              <div style={{ background: "var(--clr-surface-2)", padding: "0.75rem 1rem", borderRadius: "var(--radius)", textAlign: "center" }}>
                <span style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "var(--clr-text-muted)" }}>Tardy / Late</span>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--clr-warning)" }}>{sf9.attendance.late || 0}</div>
              </div>
            </div>
          </div>

          {/* ── PART D: SIGNATURES & CERTIFICATION ── */}
          <div style={{ borderTop: "2px solid var(--clr-border)", paddingTop: "2rem", marginTop: "2rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ borderBottom: "1px solid var(--clr-text)", height: "40px", marginBottom: "0.5rem" }} />
              <strong>{sf9.section.adviser ? `${sf9.section.adviser.firstName} ${sf9.section.adviser.lastName}` : "Class Adviser"}</strong>
              <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>Class Adviser</div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ borderBottom: "1px solid var(--clr-text)", height: "40px", marginBottom: "0.5rem" }} />
              <strong>School Principal / Head</strong>
              <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>School Head</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
