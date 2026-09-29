import { useState, useEffect } from "react";
import { api } from "@/services/api";
import type { SchoolFormSF2, SectionWithAdviser } from "@/types";

const MONTHS = [
  { val: 1, name: "January" },
  { val: 2, name: "February" },
  { val: 3, name: "March" },
  { val: 4, name: "April" },
  { val: 5, name: "May" },
  { val: 6, name: "June" },
  { val: 7, name: "July" },
  { val: 8, name: "August" },
  { val: 9, name: "September" },
  { val: 10, name: "October" },
  { val: 11, name: "November" },
  { val: 12, name: "December" },
];

export default function SF2Viewer() {
  const [sections, setSections]       = useState<SectionWithAdviser[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [month, setMonth]             = useState<number>(new Date().getMonth() + 1);
  const [year, setYear]               = useState<number>(new Date().getFullYear());

  const [sf2, setSf2]                 = useState<SchoolFormSF2 | null>(null);
  const [loading, setLoading]         = useState<boolean>(false);
  const [error, setError]             = useState<string | null>(null);

  // Load sections
  useEffect(() => {
    api.sections
      .list()
      .then((res) => {
        setSections(res.data || []);
        if (res.data && res.data.length > 0) {
          setSelectedSectionId(res.data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch SF2 report
  const fetchSF2 = async () => {
    if (!selectedSectionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.schoolForms.sf2({
        sectionId: selectedSectionId,
        month,
        year,
      });
      setSf2(res);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load SF2 report.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSF2();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSectionId, month, year]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Toolbar ── */}
      <div className="card no-print" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", flex: 1 }}>
            {/* Section */}
            <div style={{ minWidth: "220px" }}>
              <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>Section</label>
              <select
                className="form-input"
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                style={{ width: "100%" }}
              >
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    Grade {sec.gradeLevel} - {sec.name} {sec.strand ? `(${sec.strand.toUpperCase()})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Month */}
            <div style={{ minWidth: "160px" }}>
              <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>Month</label>
              <select
                className="form-input"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                style={{ width: "100%" }}
              >
                {MONTHS.map((m) => (
                  <option key={m.val} value={m.val}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div style={{ width: "120px" }}>
              <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>Year</label>
              <input
                type="number"
                className="form-input"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                min={2020}
                max={2030}
                style={{ width: "100%" }}
              />
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.print()}
            disabled={!sf2}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            🖨️ Print DepEd SF2 Form
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
          Generating monthly School Form 2 (SF2)...
        </div>
      ) : !sf2 ? (
        <div className="card no-print" style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--clr-text-muted)" }}>
          <p style={{ fontSize: "1.1rem", fontWeight: 600 }}>Please select a section above to preview SF2.</p>
        </div>
      ) : (
        /* ── Official DepEd School Form 2 (SF2) Layout ── */
        <div className="card sf9-container" style={{ maxWidth: "100%", padding: "1.5rem" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1.25rem", borderBottom: "2px solid var(--clr-border)", paddingBottom: "1rem", marginBottom: "1.25rem" }}>
            <img
              src="/knhs_logo.png"
              alt="KNHS Official Logo"
              style={{ width: "55px", height: "55px", objectFit: "contain", flexShrink: 0 }}
            />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--clr-text-muted)", fontWeight: 600 }}>
                Republic of the Philippines · Department of Education
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--clr-text-muted)", marginTop: "0.15rem" }}>
                Region: <strong>Region X (Northern Mindanao)</strong> · Division: <strong>Division of Bukidnon</strong> · Kalilangan, Bukidnon
              </div>
              <h2 style={{ margin: "0.35rem 0 0.15rem 0", fontSize: "1.25rem", fontWeight: 800 }}>
                School Form 2 (SF2) Daily Attendance Report of Learners
              </h2>
              <div style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)" }}>
                Kalilangan National High School · (Pursuant to DepEd Order No. 58, s. 2017)
              </div>
            </div>
            <img
              src="/knhs_logo.png"
              alt=""
              aria-hidden="true"
              style={{ width: "55px", height: "55px", objectFit: "contain", flexShrink: 0, opacity: 0 }}
            />
          </div>

          {/* School & Section Info */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "0.5rem 1rem",
              background: "var(--clr-surface-2)",
              padding: "0.85rem 1rem",
              borderRadius: "var(--radius)",
              marginBottom: "1rem",
              fontSize: "0.82rem",
            }}
          >
            <div>School Year: <strong>{sf2.schoolYear}</strong></div>
            <div>Month of: <strong>{sf2.monthName} {sf2.year}</strong></div>
            <div>Grade & Section: <strong>Grade {sf2.section.gradeLevel} - {sf2.section.name}</strong></div>
            <div>Adviser: <strong>{sf2.section.adviser ? `${sf2.section.adviser.lastName}, ${sf2.section.adviser.firstName}` : "Unassigned"}</strong></div>
            <div>School Days: <strong>{sf2.schoolDays?.length ?? 0} Days</strong></div>
          </div>

          {/* ── Attendance Grid Table ── */}
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
              <thead>
                <tr>
                  <th style={{ width: "35px", textAlign: "center" }}>#</th>
                  <th style={{ minWidth: "160px" }}>Learner Full Name</th>
                  {/* Days 1 to 31 */}
                  {Array.from({ length: sf2.daysInMonth }, (_, i) => i + 1).map((day) => {
                    const isSchoolDay = (sf2.schoolDays || []).includes(day);
                    return (
                      <th
                        key={day}
                        style={{
                          width: "22px",
                          padding: "4px 2px",
                          textAlign: "center",
                          background: isSchoolDay ? undefined : "rgba(255,255,255,0.03)",
                          color: isSchoolDay ? "var(--clr-text)" : "var(--clr-text-faint)",
                        }}
                      >
                        {day}
                      </th>
                    );
                  })}
                  <th style={{ width: "45px", textAlign: "center" }}>Pres</th>
                  <th style={{ width: "45px", textAlign: "center" }}>Abs</th>
                  <th style={{ width: "80px" }}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {/* ── MALE LEARNERS ── */}
                <tr style={{ background: "rgba(59, 130, 246, 0.08)" }}>
                  <td colSpan={sf2.daysInMonth + 5} style={{ fontWeight: 700, color: "#60a5fa", padding: "4px 8px" }}>
                    ♂ MALE LEARNERS ({sf2.maleLearners?.length ?? 0})
                  </td>
                </tr>
                {(sf2.maleLearners || []).map((row, idx) => renderLearnerRow(row, idx))}

                {/* ── FEMALE LEARNERS ── */}
                <tr style={{ background: "rgba(236, 72, 153, 0.08)" }}>
                  <td colSpan={sf2.daysInMonth + 5} style={{ fontWeight: 700, color: "#f472b6", padding: "4px 8px" }}>
                    ♀ FEMALE LEARNERS ({sf2.femaleLearners?.length ?? 0})
                  </td>
                </tr>
                {(sf2.femaleLearners || []).map((row, idx) => renderLearnerRow(row, idx))}
              </tbody>
            </table>
          </div>

          {/* ── DepEd SF2 Official Monthly Summary Box ── */}
          <div style={{ marginTop: "1.5rem", borderTop: "2px solid var(--clr-border)", paddingTop: "1rem" }}>
            <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", fontWeight: 700 }}>
              SUMMARY OF ATTENDANCE FOR THE MONTH
            </h4>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              <div style={{ background: "var(--clr-surface-2)", padding: "0.75rem 1rem", borderRadius: "var(--radius)", border: "1px solid var(--clr-border-soft)" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--clr-text-muted)", textTransform: "uppercase" }}>Registered Learners</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--clr-text)" }}>
                  {sf2.summary.totalEnrolment}
                  <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--clr-text-muted)", marginLeft: "0.5rem" }}>
                    (♂ {sf2.summary.maleEnrolment} · ♀ {sf2.summary.femaleEnrolment})
                  </span>
                </div>
              </div>

              <div style={{ background: "var(--clr-surface-2)", padding: "0.75rem 1rem", borderRadius: "var(--radius)", border: "1px solid var(--clr-border-soft)" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--clr-text-muted)", textTransform: "uppercase" }}>Daily Average Attendance (ADA)</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--clr-accent)" }}>
                  {sf2.summary.averageDailyAttendance}
                </div>
              </div>

              <div style={{ background: "var(--clr-surface-2)", padding: "0.75rem 1rem", borderRadius: "var(--radius)", border: "1px solid var(--clr-border-soft)" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--clr-text-muted)", textTransform: "uppercase" }}>Percentage of Attendance</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--clr-success)" }}>
                  {sf2.summary.attendancePercentage}%
                </div>
              </div>

              <div style={{ background: "var(--clr-surface-2)", padding: "0.75rem 1rem", borderRadius: "var(--radius)", border: "1px solid var(--clr-border-soft)" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--clr-text-muted)", textTransform: "uppercase" }}>Consecutive Absences (5+ Days)</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: sf2.summary.consecutiveAbsentCount > 0 ? "var(--clr-danger)" : "var(--clr-text)" }}>
                  {sf2.summary.consecutiveAbsentCount}
                </div>
              </div>
            </div>
          </div>

          {/* ── Certification & Signatures ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--clr-border-soft)" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ borderBottom: "1px solid var(--clr-text)", height: "35px", marginBottom: "0.4rem" }} />
              <strong style={{ fontSize: "0.85rem" }}>
                {sf2.section.adviser ? `${sf2.section.adviser.firstName} ${sf2.section.adviser.lastName}` : "Class Adviser"}
              </strong>
              <div style={{ fontSize: "0.72rem", color: "var(--clr-text-muted)" }}>Class Adviser Signature over Printed Name</div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ borderBottom: "1px solid var(--clr-text)", height: "35px", marginBottom: "0.4rem" }} />
              <strong style={{ fontSize: "0.85rem" }}>School Principal / Head</strong>
              <div style={{ fontSize: "0.72rem", color: "var(--clr-text-muted)" }}>School Head Signature over Printed Name</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderLearnerRow(row: SchoolFormSF2["maleLearners"][0], idx: number) {
    if (!sf2) return null;
    return (
      <tr key={row.student.id}>
        <td style={{ textAlign: "center", color: "var(--clr-text-muted)" }}>{idx + 1}</td>
        <td>
          <span style={{ fontWeight: 600 }}>{row.student.lastName}, {row.student.firstName}</span>
        </td>

        {Array.from({ length: sf2.daysInMonth }, (_, i) => i + 1).map((day) => {
          const isSchoolDay = (sf2.schoolDays || []).includes(day);
          const st = row.dailyStatuses?.[day];

          let mark = "";
          let color = "var(--clr-text-muted)";
          if (isSchoolDay) {
            if (st === "present") {
              mark = ""; // DepEd standard: blank indicates present
            } else if (st === "absent") {
              mark = "✗";
              color = "var(--clr-danger)";
            } else if (st === "late") {
              mark = "T";
              color = "var(--clr-warning)";
            } else if (st === "excused") {
              mark = "E";
              color = "var(--clr-info)";
            }
          }

          return (
            <td
              key={day}
              style={{
                textAlign: "center",
                padding: "2px",
                background: isSchoolDay ? undefined : "rgba(255,255,255,0.02)",
                color,
                fontWeight: 700,
              }}
            >
              {mark}
            </td>
          );
        })}

        <td style={{ textAlign: "center", fontWeight: 700, color: "var(--clr-success)" }}>
          {row.totalPresent}
        </td>
        <td style={{ textAlign: "center", fontWeight: 700, color: row.totalAbsent > 0 ? "var(--clr-danger)" : "var(--clr-text-muted)" }}>
          {row.totalAbsent}
        </td>
        <td style={{ fontSize: "0.7rem", color: "var(--clr-text-muted)" }}>
          {row.remarks || "—"}
        </td>
      </tr>
    );
  }
}
