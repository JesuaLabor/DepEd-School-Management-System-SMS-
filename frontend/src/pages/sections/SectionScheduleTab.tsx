import { useState, useEffect } from "react";
import { api } from "@/services/api";
import type { DayOfWeek, ScheduleSlot, SectionWithAdviser } from "@/types";
import NewScheduleSlotModal from "./NewScheduleSlotModal";

interface Props {
  section: SectionWithAdviser;
}

const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function SectionScheduleTab({ section }: Props) {
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [shsSemester, setShsSemester] = useState<number>(0); // 0 = all, 1 = sem 1, 2 = sem 2

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.schedules.getSection(section.id);
      setSlots(res.slots || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load class schedule.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.id]);

  const handleDelete = async (slotId: string, subject: string) => {
    if (!window.confirm(`Are you sure you want to remove ${subject} from this schedule?`)) return;
    try {
      setDeletingId(slotId);
      await api.schedules.delete(slotId);
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete schedule period.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredSlots = section.gradeLevel >= 11 && shsSemester > 0
    ? slots.filter((s) => !s.semester || s.semester === shsSemester)
    : slots;

  // Group slots by Day
  const slotsByDay: Record<DayOfWeek, ScheduleSlot[]> = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
  };

  let totalMinutes = 0;
  filteredSlots.forEach((s) => {
    if (slotsByDay[s.dayOfWeek]) {
      slotsByDay[s.dayOfWeek].push(s);
    }
    const [sh, sm] = s.startTime.split(":").map(Number);
    const [eh, em] = s.endTime.split(":").map(Number);
    if (!isNaN(sh) && !isNaN(eh)) {
      totalMinutes += (eh * 60 + em) - (sh * 60 + sm);
    }
  });

  // Sort slots inside each day
  DAYS.forEach((d) => {
    slotsByDay[d].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  const totalWeeklyHours = (totalMinutes / 60).toFixed(1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* ── Action Toolbar ──────────────────────────────────────────────────── */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
              🗓️ Official Section Class Timetable
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--clr-text-muted)", margin: "0.25rem 0 0 0" }}>
              Weekly instructional schedule · <strong>{filteredSlots.length}</strong> subject periods · <strong>{totalWeeklyHours}</strong> contact hrs/week
            </p>
          </div>

          {/* SHS Semester Pill Toggle */}
          {section.gradeLevel >= 11 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "var(--clr-surface-2)", padding: "3px 4px", borderRadius: "var(--radius-sm)", border: "1px solid var(--clr-border)" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--clr-text-muted)", padding: "0 0.35rem" }}>Semester:</span>
              {[
                { val: 0, label: "All" },
                { val: 1, label: "1st Sem" },
                { val: 2, label: "2nd Sem" },
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  onClick={() => setShsSemester(s.val)}
                  style={{
                    padding: "0.25rem 0.6rem",
                    border: "none",
                    borderRadius: "4px",
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    background: shsSemester === s.val ? "var(--clr-primary)" : "transparent",
                    color: shsSemester === s.val ? "#fff" : "var(--clr-text-muted)",
                    transition: "all var(--transition)",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
            🖨️ Print Timetable
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => { setEditingSlot(null); setShowModal(true); }}
          >
            + Add Subject Period
          </button>
        </div>
      </div>

      {/* ── Official Print Header ───────────────────────────────────────────── */}
      <div style={{ display: "none" }} className="print-header">
        <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Department of Education</h2>
          <h3 style={{ margin: "0.25rem 0", fontSize: "1rem" }}>Official Class Program & Timetable</h3>
          <p style={{ margin: 0, fontSize: "0.85rem" }}>
            Grade Level: <strong>Grade {section.gradeLevel}</strong> · Section: <strong>{section.name}</strong> · SY: <strong>{section.schoolYear}</strong>
            {section.adviser ? ` · Adviser: ${section.adviser.lastName}, ${section.adviser.firstName}` : ""}
            {section.room ? ` · Room: ${section.room}` : ""}
          </p>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderLeft: "4px solid var(--clr-danger)", background: "rgba(239,68,68,0.08)" }}>
          <span style={{ color: "var(--clr-danger)" }}>⚠️ {error}</span>
        </div>
      )}

      {/* ── Weekly Timetable 5-Day Grid ──────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--clr-text-muted)" }}>
          <div className="spinner" style={{ margin: "0 auto 1rem" }} />
          Loading class schedule...
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            alignItems: "start",
          }}
        >
          {DAYS.map((day) => {
            const daySlots = slotsByDay[day];
            return (
              <div
                key={day}
                className="card"
                style={{
                  padding: "0.85rem",
                  background: "var(--clr-surface)",
                  borderRadius: "10px",
                  borderTop: "3px solid var(--clr-primary)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  minHeight: "260px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--clr-border-soft)", paddingBottom: "0.5rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--clr-text)" }}>
                    {day}
                  </span>
                  <span className="badge" style={{ fontSize: "0.65rem", background: "var(--clr-surface-2)" }}>
                    {daySlots.length} {daySlots.length === 1 ? "period" : "periods"}
                  </span>
                </div>

                {daySlots.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2rem 0.5rem", color: "var(--clr-text-muted)", fontSize: "0.775rem", fontStyle: "italic" }}>
                    No classes scheduled
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {daySlots.map((s) => (
                      <div
                        key={s.id}
                        style={{
                          padding: "0.6rem 0.75rem",
                          borderRadius: "6px",
                          background: "var(--clr-surface-2)",
                          borderLeft: "3px solid var(--clr-accent)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.25rem",
                          position: "relative",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.725rem", fontWeight: 700, color: "var(--clr-accent)", fontFamily: "monospace" }}>
                            ⏰ {s.startTime} - {s.endTime}
                          </span>
                          <div className="no-print" style={{ display: "flex", gap: "2px" }}>
                            <button
                              onClick={() => { setEditingSlot(s); setShowModal(true); }}
                              style={{ background: "none", border: "none", color: "var(--clr-text-muted)", cursor: "pointer", fontSize: "0.75rem", padding: "1px 4px" }}
                              title="Edit period"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(s.id, s.subjectName)}
                              disabled={deletingId === s.id}
                              style={{ background: "none", border: "none", color: "var(--clr-danger)", cursor: "pointer", fontSize: "0.75rem", padding: "1px 4px" }}
                              title="Delete period"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--clr-text)" }}>
                          {s.subjectName}
                        </div>

                        <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", display: "flex", flexDirection: "column", gap: "1px" }}>
                          <span>👨‍🏫 {s.teacherName}</span>
                          {s.room && <span>📍 {s.room}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal ───────────────────────────────────────────────────────────── */}
      {showModal && (
        <NewScheduleSlotModal
          sectionId={section.id}
          gradeLevel={section.gradeLevel}
          strand={section.strand}
          defaultRoom={section.room}
          slot={editingSlot}
          onClose={() => { setShowModal(false); setEditingSlot(null); }}
          onSuccess={() => {
            setShowModal(false);
            setEditingSlot(null);
            fetchSchedule();
          }}
        />
      )}
    </div>
  );
}
