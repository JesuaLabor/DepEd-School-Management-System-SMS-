import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "@/services/api";
import type { TeacherLoadSummary, ScheduleSlot } from "@/types";

export default function TeacherLoadPage() {
  const [teachers, setTeachers] = useState<TeacherLoadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherLoadSummary | null>(null);

  const fetchLoads = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.schedules.teachersLoad();
      setTeachers(res.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load teacher workloads";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoads();
  }, []);

  const filtered = teachers.filter(
    (t) =>
      t.teacherName.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalTeachingHours = teachers.reduce((acc, t) => acc + t.totalHours, 0);
  const avgHours = teachers.length > 0 ? (totalTeachingHours / teachers.length).toFixed(1) : "0";

  return (
    <>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1>👨‍🏫 Faculty Teaching Load & Schedules</h1>
          <p>
            Monitor instructional contact hours, subject assignments, and schedule distributions across all teachers.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link to="/sections" className="btn btn-outline btn-sm">
            ← Classes & Sections
          </Link>
          <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
            🖨️ Print Faculty Load Report
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* ── Summary Stats ─────────────────────────────────────────────────── */}
        <div className="stats-grid mb-6">
          <div className="stat-card">
            <div className="stat-icon">👨‍🏫</div>
            <div className="stat-value" style={{ color: "var(--clr-primary)" }}>{teachers.length}</div>
            <div className="stat-label">Active Teachers</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⏱️</div>
            <div className="stat-value" style={{ color: "var(--clr-accent)" }}>{totalTeachingHours.toFixed(1)} hrs</div>
            <div className="stat-label">Total Instructional Hours / Wk</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-value" style={{ color: "var(--clr-success)" }}>{avgHours} hrs</div>
            <div className="stat-label">Average Load per Teacher</div>
          </div>
        </div>

        {/* ── Search & Filter ──────────────────────────────────────────────── */}
        <div className="card mb-6" style={{ padding: "0.75rem 1.25rem" }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search faculty by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error && (
          <div className="card mb-6" style={{ borderLeft: "4px solid var(--clr-danger)", background: "rgba(239,68,68,0.08)" }}>
            <span style={{ color: "var(--clr-danger)" }}>⚠️ {error}</span>
          </div>
        )}

        {/* ── Teachers Table ───────────────────────────────────────────────── */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--clr-text-muted)" }}>
              <div className="spinner" style={{ margin: "0 auto 1rem" }} />
              Loading faculty workloads...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--clr-text-muted)" }}>
              No teachers found.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Teacher Name</th>
                    <th>Email Address</th>
                    <th>Assigned Periods</th>
                    <th>Weekly Contact Hours</th>
                    <th>Workload Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => {
                    const isHeavy = t.totalHours >= 25;
                    const isOptimal = t.totalHours >= 15 && t.totalHours < 25;

                    return (
                      <tr key={t.teacherId}>
                        <td style={{ fontWeight: 600, color: "var(--clr-text)" }}>
                          {t.teacherName}
                        </td>
                        <td style={{ color: "var(--clr-text-muted)" }}>{t.email}</td>
                        <td>
                          <span className="badge" style={{ background: "var(--clr-surface-2)" }}>
                            {t.totalSlots} {t.totalSlots === 1 ? "period" : "periods"}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: "var(--clr-text)" }}>
                          {t.totalHours.toFixed(1)} hrs/week
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              isHeavy ? "badge-warning" : isOptimal ? "badge-success" : "badge-info"
                            }`}
                          >
                            {isHeavy ? "⚠️ Heavy Load (≥25h)" : isOptimal ? "✓ Full Load" : "Light Load (<15h)"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ padding: "3px 10px", fontSize: "0.775rem" }}
                            onClick={() => setSelectedTeacher(t)}
                          >
                            View Schedule →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Teacher Timetable Modal ─────────────────────────────────────────── */}
      {selectedTeacher && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setSelectedTeacher(null); }}>
          <div className="modal-box" style={{ maxWidth: "750px" }}>
            <div className="modal-header">
              <div>
                <h2>🗓️ {selectedTeacher.teacherName}'s Teaching Schedule</h2>
                <span style={{ fontSize: "0.85rem", color: "var(--clr-text-muted)" }}>
                  {selectedTeacher.email} · <strong>{selectedTeacher.totalHours.toFixed(1)}</strong> weekly hours ({selectedTeacher.totalSlots} periods)
                </span>
              </div>
              <button className="modal-close" onClick={() => setSelectedTeacher(null)}>×</button>
            </div>

            <div style={{ marginTop: "1rem" }}>
              {selectedTeacher.slots.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--clr-text-muted)", fontStyle: "italic" }}>
                  This teacher currently has no scheduled subject periods assigned.
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Day</th>
                        <th>Time</th>
                        <th>Subject</th>
                        <th>Section</th>
                        <th>Room</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTeacher.slots
                        .slice()
                        .sort((a, b) => a.dayOfWeek.localeCompare(b.dayOfWeek) || a.startTime.localeCompare(b.startTime))
                        .map((slot: ScheduleSlot) => (
                          <tr key={slot.id}>
                            <td style={{ fontWeight: 600 }}>{slot.dayOfWeek}</td>
                            <td style={{ fontFamily: "monospace", color: "var(--clr-accent)" }}>
                              {slot.startTime} - {slot.endTime}
                            </td>
                            <td style={{ fontWeight: 600 }}>{slot.subjectName}</td>
                            <td>
                              <span className="badge" style={{ background: "var(--clr-surface-2)" }}>
                                Grade {slot.gradeLevel} - {slot.sectionName}
                              </span>
                            </td>
                            <td style={{ color: "var(--clr-text-muted)" }}>{slot.room || "—"}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setSelectedTeacher(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
