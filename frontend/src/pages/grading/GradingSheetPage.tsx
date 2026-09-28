import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "@/services/api";
import { enqueueMutation } from "@/services/offlineQueue";
import type {
  SectionWithAdviser,
  Subject,
  StudentSummary,
  GradeRecord,
  GradeSheetStats,
} from "@/types";
import DO8GradingCalculatorModal from "./DO8GradingCalculatorModal";

type Quarter = "q1" | "q2" | "q3" | "q4";

export default function GradingSheetPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Sections & Curriculum
  const [sections, setSections]         = useState<SectionWithAdviser[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>(searchParams.get("sectionId") || "");
  const [subjects, setSubjects]         = useState<Subject[]>([]);
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>("");
  const [quarter, setQuarter]           = useState<Quarter>("q1");
  const [shsSemester, setShsSemester]   = useState<number>(0); // 0 = all, 1 = sem 1, 2 = sem 2
  const [schoolYear, setSchoolYear]     = useState<string>("2024-2025");

  // DO 8 Calculator Modal State
  const [showCalculator, setShowCalculator]       = useState(false);
  const [calculatorStudent, setCalculatorStudent] = useState<StudentSummary | null>(null);

  // Sheet Data
  const [students, setStudents]         = useState<StudentSummary[]>([]);
  const [gradesMap, setGradesMap]       = useState<Record<string, GradeRecord>>({});
  const [stats, setStats]               = useState<GradeSheetStats | null>(null);

  // Editable Quarter Inputs: studentId -> string representation of grade
  const [inputGrades, setInputGrades]   = useState<Record<string, string>>({});
  const [search, setSearch]             = useState<string>("");

  const [loadingSections, setLoadingSections] = useState<boolean>(true);
  const [loadingSheet, setLoadingSheet]       = useState<boolean>(false);
  const [saving, setSaving]                   = useState<boolean>(false);
  const [error, setError]                     = useState<string | null>(null);
  const [successMsg, setSuccessMsg]           = useState<string | null>(null);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // 1. Load active sections
  useEffect(() => {
    api.sections
      .list({ schoolYear })
      .then((res) => {
        setSections(res.data || []);
        if (res.data && res.data.length > 0 && !selectedSectionId) {
          setSelectedSectionId(res.data[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSections(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolYear]);

  // Selected section object
  const activeSection = useMemo(() => {
    return sections.find((s) => s.id === selectedSectionId) || null;
  }, [sections, selectedSectionId]);

  // 2. Load subjects when active section or semester changes
  useEffect(() => {
    if (!activeSection) return;
    const semToUse = activeSection.gradeLevel >= 11 ? (shsSemester || undefined) : undefined;
    api.grades
      .subjects(activeSection.gradeLevel, activeSection.strand, semToUse)
      .then((res) => {
        const loadedSubs = res.data || [];
        setSubjects(loadedSubs);
        if (loadedSubs.length > 0) {
          if (!loadedSubs.some((s) => s.code === selectedSubjectCode)) {
            setSelectedSubjectCode(loadedSubs[0].code);
          }
        } else {
          setSelectedSubjectCode("");
        }
      })
      .catch(() => {});
  }, [activeSection, shsSemester]);

  // Selected subject object
  const activeSubject = useMemo(() => {
    return subjects.find((s) => s.code === selectedSubjectCode) || null;
  }, [subjects, selectedSubjectCode]);

  // 3. Fetch Grading Sheet when section or subject changes
  const fetchSheet = async () => {
    if (!selectedSectionId || !selectedSubjectCode) return;
    setLoadingSheet(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.grades.sectionSheet(
        selectedSectionId,
        selectedSubjectCode,
        schoolYear
      );

      setStudents(res.students || []);
      setGradesMap(res.grades || {});
      setStats(res.stats || null);

      // Populate editable input state for current quarter
      const initialInputs: Record<string, string> = {};
      (res.students || []).forEach((st) => {
        const record = res.grades?.[st.id];
        let val = "";
        if (record) {
          const qVal = record[quarter];
          if (qVal !== undefined && qVal !== null) {
            val = String(qVal);
          }
        }
        initialInputs[st.id] = val;
      });
      setInputGrades(initialInputs);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load grade sheet.";
      setError(message);
    } finally {
      setLoadingSheet(false);
    }
  };

  useEffect(() => {
    fetchSheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSectionId, selectedSubjectCode, quarter, schoolYear]);

  // Sync URL search param
  useEffect(() => {
    if (selectedSectionId) {
      setSearchParams({ sectionId: selectedSectionId });
    }
  }, [selectedSectionId, setSearchParams]);

  // Handle grade input change
  const handleGradeChange = (studentId: string, val: string) => {
    setInputGrades((prev) => ({
      ...prev,
      [studentId]: val,
    }));
  };

  // Keyboard navigation: Enter or Arrow Down moves to next student input
  const handleKeyDown = (e: React.KeyboardEvent, index: number, studentList: StudentSummary[]) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      if (index + 1 < studentList.length) {
        const nextId = studentList[index + 1].id;
        inputRefs.current[nextId]?.focus();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (index - 1 >= 0) {
        const prevId = studentList[index - 1].id;
        inputRefs.current[prevId]?.focus();
      }
    }
  };

  // Unsaved changes check
  const hasChanges = useMemo(() => {
    return students.some((st) => {
      const rec = gradesMap[st.id];
      const origVal = rec && rec[quarter] !== undefined && rec[quarter] !== null ? String(rec[quarter]) : "";
      const currentVal = inputGrades[st.id] || "";
      return origVal !== currentVal;
    });
  }, [students, gradesMap, quarter, inputGrades]);

  // Save Quarter Grades
  const handleSave = async () => {
    if (!activeSection || !activeSubject) return;
    setError(null);
    setSuccessMsg(null);

    const entries = students
      .filter((st) => inputGrades[st.id] !== undefined && inputGrades[st.id] !== "")
      .map((st) => {
        const num = parseFloat(inputGrades[st.id]);
        return {
          studentId: st.id,
          grade: isNaN(num) ? null : num,
        };
      });

    // Validate grades range (60 - 100)
    for (const e of entries) {
      if (e.grade !== null && (e.grade < 60 || e.grade > 100)) {
        setError("Invalid grade detected! DepEd quarterly ratings must be between 60.0 and 100.0.");
        return;
      }
    }

    if (entries.length === 0) {
      setError("No grade entries entered to save.");
      return;
    }

    setSaving(true);
    const payload = {
      sectionId:   activeSection.id,
      subjectCode: activeSubject.code,
      subjectName: activeSubject.name,
      schoolYear,
      gradeLevel:  activeSection.gradeLevel,
      quarter,
      entries,
    };

    if (!navigator.onLine) {
      enqueueMutation({
        endpoint: "/grades/batch",
        method: "POST",
        body: payload,
        title: `Grades ${activeSubject.code} Q${quarter.slice(1).toUpperCase()} (${activeSection.name})`,
      });
      setSuccessMsg(`Offline Mode: Saved ${entries.length} student grade entries locally. Will auto-sync when online.`);
      // Update local gradesMap to prevent losing changes
      setGradesMap((prev) => {
        const updated = { ...prev };
        entries.forEach((e) => {
          if (!updated[e.studentId]) {
            updated[e.studentId] = {
              id: `local_${e.studentId}`,
              studentId: e.studentId,
              sectionId: activeSection.id,
              subjectCode: activeSubject.code,
              subjectName: activeSubject.name,
              schoolYear,
              gradeLevel: activeSection.gradeLevel,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          }
          ((updated[e.studentId] as unknown) as Record<string, unknown>)[quarter] = e.grade;
        });
        return updated;
      });
      setSaving(false);
      return;
    }

    try {
      await api.grades.batchQuarter(payload);

      setSuccessMsg(`Quarter ${quarter.toUpperCase()} grades successfully recorded!`);
      fetchSheet();
    } catch (err: unknown) {
      enqueueMutation({
        endpoint: "/grades/batch",
        method: "POST",
        body: payload,
        title: `Grades ${activeSubject.code} Q${quarter.slice(1).toUpperCase()} (${activeSection.name})`,
      });
      setSuccessMsg(`Network error. Queued ${entries.length} grade entries for offline sync.`);
    } finally {
      setSaving(false);
    }
  };

  // Filtered students by search
  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.lrn.includes(q)
    );
  }, [students, search]);

  const maleStudents = filteredStudents.filter((s) => s.sex?.toLowerCase() === "male");
  const femaleStudents = filteredStudents.filter((s) => s.sex?.toLowerCase() === "female");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Page Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--clr-text-muted)", marginBottom: "0.25rem" }}>
            <span>Academics</span>
            <span>/</span>
            <span style={{ color: "var(--clr-text)" }}>Grading & Assessment</span>
          </div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, color: "var(--clr-text)" }}>
            Quarterly Grading Sheet
          </h1>
          <p style={{ margin: "0.25rem 0 0 0", color: "var(--clr-text-muted)", fontSize: "0.9rem" }}>
            Encode DepEd quarterly ratings (Q1–Q4), compute final subject averages, and generate SF9 report cards.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setCalculatorStudent(null);
              setShowCalculator(true);
            }}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            🧮 DO 8 Calculator
          </button>
          <Link
            to="/sf9"
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            📄 View Learner SF9 Card →
          </Link>
        </div>
      </div>

      {/* ── Control Bar ── */}
      <div className="card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", alignItems: "flex-end" }}>
          {/* Section Selector */}
          <div>
            <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>Class Section</label>
            <select
              className="form-input"
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              style={{ width: "100%" }}
              disabled={loadingSections}
            >
              {sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  Grade {sec.gradeLevel} - {sec.name} {sec.strand ? `(${sec.strand.toUpperCase()})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Learning Area / Subject */}
          <div>
            <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>Subject / Learning Area</label>
            <select
              className="form-input"
              value={selectedSubjectCode}
              onChange={(e) => setSelectedSubjectCode(e.target.value)}
              style={{ width: "100%" }}
            >
              {subjects.map((sub) => (
                <option key={sub.code} value={sub.code}>
                  {sub.name} ({sub.code}){sub.semester ? ` · Sem ${sub.semester}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* SHS Semester Toggle (Grades 11-12) */}
          {activeSection && activeSection.gradeLevel >= 11 && (
            <div>
              <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>
                SHS Semester
              </label>
              <div style={{ display: "flex", gap: "2px", background: "var(--clr-bg)", padding: "2px", borderRadius: "var(--radius-sm)", border: "1px solid var(--clr-border-soft)" }}>
                {[
                  { val: 0, label: "All" },
                  { val: 1, label: "Sem 1" },
                  { val: 2, label: "Sem 2" },
                ].map((s) => (
                  <button
                    key={s.val}
                    type="button"
                    onClick={() => setShsSemester(s.val)}
                    style={{
                      flex: 1,
                      padding: "0.35rem 0.4rem",
                      border: "none",
                      borderRadius: "4px",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      background: shsSemester === s.val ? "var(--clr-accent)" : "transparent",
                      color: shsSemester === s.val ? "#fff" : "var(--clr-text-muted)",
                      transition: "all var(--transition)",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* School Year */}
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

          {/* Quarter Tabs */}
          <div>
            <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>Active Quarter to Encode</label>
            <div style={{ display: "flex", gap: "3px", background: "var(--clr-bg)", padding: "2px", borderRadius: "var(--radius-sm)", border: "1px solid var(--clr-border-soft)" }}>
              {(["q1", "q2", "q3", "q4"] as Quarter[]).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuarter(q)}
                  style={{
                    flex: 1,
                    padding: "0.35rem 0",
                    border: "none",
                    borderRadius: "4px",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    background: quarter === q ? "var(--clr-primary)" : "transparent",
                    color: quarter === q ? "#fff" : "var(--clr-text-muted)",
                    transition: "all var(--transition)",
                  }}
                >
                  {q.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary KPI Stats Bar ── */}
      {stats && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
          <div className="attendance-stat-box">
            <div className="count" style={{ color: "var(--clr-accent)" }}>
              {quarter === "q1" ? stats.avgQ1 : quarter === "q2" ? stats.avgQ2 : quarter === "q3" ? stats.avgQ3 : stats.avgQ4}
            </div>
            <div>
              <div className="label">Class {quarter.toUpperCase()} Average</div>
              <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>Mean rating</span>
            </div>
          </div>

          <div className="attendance-stat-box">
            <div className="count" style={{ color: "var(--clr-success)" }}>{stats.passedCount}</div>
            <div>
              <div className="label">Passed (≥75)</div>
              <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>Passing mark</span>
            </div>
          </div>

          <div className="attendance-stat-box">
            <div className="count" style={{ color: "var(--clr-danger)" }}>{stats.failedCount}</div>
            <div>
              <div className="label">Failed (&lt;75)</div>
              <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>Needs intervention</span>
            </div>
          </div>

          <div className="attendance-stat-box">
            <div className="count" style={{ color: "var(--clr-primary)" }}>{stats.avgFinal}</div>
            <div>
              <div className="label">Class Final Average</div>
              <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>All 4 quarters</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Alerts ── */}
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

      {/* ── Table Toolbar ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <input
          type="text"
          className="form-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter learner by name or LRN..."
          style={{ width: "280px", fontSize: "0.85rem", padding: "0.45rem 0.75rem" }}
        />

        <div style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)" }}>
          <kbd style={{ background: "var(--clr-surface-2)", padding: "2px 6px", borderRadius: "4px", border: "1px solid var(--clr-border)" }}>Enter</kbd> or <kbd style={{ background: "var(--clr-surface-2)", padding: "2px 6px", borderRadius: "4px", border: "1px solid var(--clr-border)" }}>↓</kbd> moves to the next learner
        </div>
      </div>

      {/* ── Grading Sheet Table ── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--clr-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
              {activeSubject?.name || "Subject Grading Sheet"}
            </h3>
            <span style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)" }}>
              {activeSection?.name ? `Section ${activeSection.name} (Grade ${activeSection.gradeLevel})` : ""} · Active: <strong>Quarter {quarter.toUpperCase()}</strong>
            </span>
          </div>
          <span style={{ fontSize: "0.85rem", color: "var(--clr-text-muted)" }}>
            {students.length} Learners in Section
          </span>
        </div>

        {loadingSheet ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "var(--clr-text-muted)" }}>
            <div className="spinner" style={{ margin: "0 auto 1rem" }} />
            Loading class grading matrix...
          </div>
        ) : students.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--clr-text-muted)" }}>
            <p style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              No learners enrolled in this section.
            </p>
            <p style={{ fontSize: "0.85rem" }}>
              Please assign students to this section under the Classes & Sections module first.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ width: "45px", textAlign: "center" }}>#</th>
                  <th style={{ width: "130px" }}>LRN</th>
                  <th style={{ minWidth: "220px" }}>Learner Name</th>
                  <th style={{ width: "85px", textAlign: "center", background: quarter === "q1" ? "rgba(37, 99, 235, 0.15)" : undefined }}>Q1</th>
                  <th style={{ width: "85px", textAlign: "center", background: quarter === "q2" ? "rgba(37, 99, 235, 0.15)" : undefined }}>Q2</th>
                  <th style={{ width: "85px", textAlign: "center", background: quarter === "q3" ? "rgba(37, 99, 235, 0.15)" : undefined }}>Q3</th>
                  <th style={{ width: "85px", textAlign: "center", background: quarter === "q4" ? "rgba(37, 99, 235, 0.15)" : undefined }}>Q4</th>
                  <th style={{ width: "100px", textAlign: "center" }}>Final Rating</th>
                  <th style={{ width: "110px", textAlign: "center" }}>Remarks</th>
                  <th style={{ width: "80px", textAlign: "right" }}>SF9</th>
                </tr>
              </thead>
              <tbody>
                {/* ── MALE LEARNERS ── */}
                {maleStudents.length > 0 && (
                  <tr style={{ background: "rgba(59, 130, 246, 0.05)" }}>
                    <td colSpan={10} style={{ fontWeight: 700, fontSize: "0.8rem", color: "#60a5fa", padding: "0.45rem 1rem" }}>
                      ♂ MALE LEARNERS ({maleStudents.length})
                    </td>
                  </tr>
                )}
                {maleStudents.map((st, idx) => renderStudentRow(st, idx, maleStudents))}

                {/* ── FEMALE LEARNERS ── */}
                {femaleStudents.length > 0 && (
                  <tr style={{ background: "rgba(236, 72, 153, 0.05)" }}>
                    <td colSpan={10} style={{ fontWeight: 700, fontSize: "0.8rem", color: "#f472b6", padding: "0.45rem 1rem" }}>
                      ♀ FEMALE LEARNERS ({femaleStudents.length})
                    </td>
                  </tr>
                )}
                {femaleStudents.map((st, idx) => renderStudentRow(st, idx, femaleStudents))}
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
        <div>
          {hasChanges ? (
            <span style={{ fontSize: "0.85rem", color: "var(--clr-warning)", fontWeight: 600 }}>
              ● Unsaved quarterly grade entries detected for Quarter {quarter.toUpperCase()}.
            </span>
          ) : (
            <span style={{ fontSize: "0.85rem", color: "var(--clr-text-muted)" }}>
              Quarter {quarter.toUpperCase()} grades are up to date.
            </span>
          )}
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving || loadingSheet || students.length === 0}
          style={{ padding: "0.6rem 1.5rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          {saving ? (
            <>
              <div className="spinner" style={{ width: "14px", height: "14px", borderWidth: "2px" }} />
              Saving Grades...
            </>
          ) : (
            <>
              💾 Save {quarter.toUpperCase()} Grades
            </>
          )}
        </button>
      </div>

      {/* DO 8 Grading Calculator Modal */}
      {showCalculator && activeSection && activeSubject && (
        <DO8GradingCalculatorModal
          gradeLevel={activeSection.gradeLevel}
          subjectCode={activeSubject.code}
          subjectName={activeSubject.name}
          strand={activeSection.strand}
          studentName={calculatorStudent ? `${calculatorStudent.lastName}, ${calculatorStudent.firstName}` : undefined}
          studentLrn={calculatorStudent?.lrn}
          quarterLabel={quarter}
          onApply={calculatorStudent ? (grade) => handleGradeChange(calculatorStudent.id, String(grade)) : undefined}
          onClose={() => {
            setShowCalculator(false);
            setCalculatorStudent(null);
          }}
        />
      )}
    </div>
  );

  function renderStudentRow(st: StudentSummary, idx: number, list: StudentSummary[]) {
    const record = gradesMap[st.id];
    const val = inputGrades[st.id] ?? "";
    const num = parseFloat(val);
    const isPassing = !isNaN(num) && num >= 75;
    const isFailing = !isNaN(num) && num < 75;

    // Final preview calculation
    const q1 = quarter === "q1" ? (isNaN(num) ? undefined : num) : record?.q1;
    const q2 = quarter === "q2" ? (isNaN(num) ? undefined : num) : record?.q2;
    const q3 = quarter === "q3" ? (isNaN(num) ? undefined : num) : record?.q3;
    const q4 = quarter === "q4" ? (isNaN(num) ? undefined : num) : record?.q4;

    const quarters = [q1, q2, q3, q4].filter((v): v is number => v !== undefined && v !== null);
    const computedFinal = quarters.length > 0 ? Math.round(quarters.reduce((a, b) => a + b, 0) / quarters.length) : null;
    const computedRemarks = computedFinal !== null ? (computedFinal >= 75 ? "Passed" : "Failed") : "—";

    return (
      <tr key={st.id}>
        <td style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--clr-text-muted)" }}>
          {idx + 1}
        </td>

        <td style={{ fontFamily: "monospace", fontSize: "0.82rem", fontWeight: 600 }}>
          {st.lrn}
        </td>

        <td>
          <strong style={{ color: "var(--clr-text)" }}>
            {st.lastName}, {st.firstName} {st.middleName ? `${st.middleName[0]}.` : ""}
          </strong>
        </td>

        {/* Q1 */}
        <td style={{ textAlign: "center", background: quarter === "q1" ? "rgba(37, 99, 235, 0.08)" : undefined }}>
          {quarter === "q1" ? (
            <input
              ref={(el) => { inputRefs.current[st.id] = el; }}
              type="number"
              step="1"
              min="60"
              max="100"
              className={`grade-input ${isPassing ? "is-passing" : isFailing ? "is-failing" : ""}`}
              value={val}
              onChange={(e) => handleGradeChange(st.id, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, idx, list)}
              placeholder="—"
            />
          ) : (
            <span style={{ fontWeight: 600, color: (record?.q1 || 0) >= 75 ? "var(--clr-text)" : "var(--clr-danger)" }}>
              {record?.q1 !== undefined && record?.q1 !== null ? record.q1 : "—"}
            </span>
          )}
        </td>

        {/* Q2 */}
        <td style={{ textAlign: "center", background: quarter === "q2" ? "rgba(37, 99, 235, 0.08)" : undefined }}>
          {quarter === "q2" ? (
            <input
              ref={(el) => { inputRefs.current[st.id] = el; }}
              type="number"
              step="1"
              min="60"
              max="100"
              className={`grade-input ${isPassing ? "is-passing" : isFailing ? "is-failing" : ""}`}
              value={val}
              onChange={(e) => handleGradeChange(st.id, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, idx, list)}
              placeholder="—"
            />
          ) : (
            <span style={{ fontWeight: 600, color: (record?.q2 || 0) >= 75 ? "var(--clr-text)" : "var(--clr-danger)" }}>
              {record?.q2 !== undefined && record?.q2 !== null ? record.q2 : "—"}
            </span>
          )}
        </td>

        {/* Q3 */}
        <td style={{ textAlign: "center", background: quarter === "q3" ? "rgba(37, 99, 235, 0.08)" : undefined }}>
          {quarter === "q3" ? (
            <input
              ref={(el) => { inputRefs.current[st.id] = el; }}
              type="number"
              step="1"
              min="60"
              max="100"
              className={`grade-input ${isPassing ? "is-passing" : isFailing ? "is-failing" : ""}`}
              value={val}
              onChange={(e) => handleGradeChange(st.id, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, idx, list)}
              placeholder="—"
            />
          ) : (
            <span style={{ fontWeight: 600, color: (record?.q3 || 0) >= 75 ? "var(--clr-text)" : "var(--clr-danger)" }}>
              {record?.q3 !== undefined && record?.q3 !== null ? record.q3 : "—"}
            </span>
          )}
        </td>

        {/* Q4 */}
        <td style={{ textAlign: "center", background: quarter === "q4" ? "rgba(37, 99, 235, 0.08)" : undefined }}>
          {quarter === "q4" ? (
            <input
              ref={(el) => { inputRefs.current[st.id] = el; }}
              type="number"
              step="1"
              min="60"
              max="100"
              className={`grade-input ${isPassing ? "is-passing" : isFailing ? "is-failing" : ""}`}
              value={val}
              onChange={(e) => handleGradeChange(st.id, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, idx, list)}
              placeholder="—"
            />
          ) : (
            <span style={{ fontWeight: 600, color: (record?.q4 || 0) >= 75 ? "var(--clr-text)" : "var(--clr-danger)" }}>
              {record?.q4 !== undefined && record?.q4 !== null ? record.q4 : "—"}
            </span>
          )}
        </td>

        {/* Final Rating */}
        <td style={{ textAlign: "center" }}>
          <span
            style={{
              fontWeight: 800,
              fontSize: "0.95rem",
              color: computedFinal !== null ? (computedFinal >= 75 ? "var(--clr-text)" : "var(--clr-danger)") : "var(--clr-text-muted)",
            }}
          >
            {computedFinal !== null ? computedFinal : "—"}
          </span>
        </td>

        {/* Remarks */}
        <td style={{ textAlign: "center" }}>
          {computedRemarks === "Passed" ? (
            <span className="badge badge-success" style={{ fontSize: "0.72rem" }}>
              Passed
            </span>
          ) : computedRemarks === "Failed" ? (
            <span className="badge badge-error" style={{ fontSize: "0.72rem" }}>
              Failed
            </span>
          ) : (
            <span style={{ color: "var(--clr-text-muted)", fontSize: "0.8rem" }}>—</span>
          )}
        </td>

        {/* SF9 & Calculator Actions */}
        <td style={{ textAlign: "right" }}>
          <div style={{ display: "inline-flex", gap: "0.35rem", alignItems: "center" }}>
            <button
              type="button"
              className="btn-icon"
              title="Compute via DO 8 Raw Scores"
              style={{ fontSize: "0.85rem", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
              onClick={() => {
                setCalculatorStudent(st);
                setShowCalculator(true);
              }}
            >
              🧮
            </button>
            <Link
              to={`/sf9?studentId=${st.id}`}
              className="btn-icon"
              title="View Student SF9 Card"
              style={{ fontSize: "0.85rem", color: "var(--clr-accent)" }}
            >
              📄
            </Link>
          </div>
        </td>
      </tr>
    );
  }
}
