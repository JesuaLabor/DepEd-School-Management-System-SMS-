import { useState, useEffect } from "react";
import { api } from "@/services/api";
import type { AdviserSummary, DayOfWeek, ScheduleSlot, Subject } from "@/types";

interface Props {
  sectionId: string;
  gradeLevel: number;
  strand?: string;
  defaultRoom?: string;
  slot?: ScheduleSlot | null;
  onClose: () => void;
  onSuccess: () => void;
}

const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function NewScheduleSlotModal({
  sectionId,
  gradeLevel,
  strand,
  defaultRoom = "",
  slot,
  onClose,
  onSuccess,
}: Props) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<AdviserSummary[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [selectedSubject, setSelectedSubject] = useState(slot?.subjectCode ?? "");
  const [teacherId, setTeacherId] = useState(slot?.teacherId ?? "");
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(slot?.dayOfWeek ?? "Monday");
  const [startTime, setStartTime] = useState(slot?.startTime ?? "07:30");
  const [endTime, setEndTime] = useState(slot?.endTime ?? "08:30");
  const [room, setRoom] = useState(slot?.room ?? defaultRoom);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.grades.subjects(gradeLevel, strand),
      api.sections.teachers(),
    ])
      .then(([subRes, teachRes]) => {
        setSubjects(subRes.data || []);
        setTeachers(teachRes.data || []);
        if (!selectedSubject && subRes.data && subRes.data.length > 0) {
          setSelectedSubject(subRes.data[0].code);
        }
        if (!teacherId && teachRes.data && teachRes.data.length > 0) {
          setTeacherId(teachRes.data[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingOptions(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradeLevel, strand]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject || !teacherId) {
      setError("Please select both a subject and an assigned teacher.");
      return;
    }

    const subObj = subjects.find((s) => s.code === selectedSubject);
    const subjectName = subObj ? subObj.name : selectedSubject;

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        sectionId,
        subjectCode: selectedSubject,
        subjectName,
        teacherId,
        dayOfWeek,
        startTime,
        endTime,
        room: room.trim() || undefined,
      };

      if (slot) {
        await api.schedules.update(slot.id, payload);
      } else {
        await api.schedules.create(payload);
      }

      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save schedule period.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: "560px" }}>
        <div className="modal-header">
          <h2>{slot ? "✏️ Edit Class Schedule Period" : "➕ Schedule New Subject Period"}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {loadingOptions ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--clr-text-muted)" }}>
            <div className="spinner" style={{ margin: "0 auto 1rem" }} />
            Loading curriculum subjects and teachers...
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {error && (
              <div className="badge badge-danger" style={{ padding: "0.6rem 0.85rem", borderRadius: "6px", lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
                ⚠️ {error}
              </div>
            )}

            {/* Subject Selection */}
            <div className="form-group">
              <label className="form-label">DepEd Subject / Learning Area *</label>
              <select
                className="form-select"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                required
              >
                {subjects.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Teacher Selection */}
            <div className="form-group">
              <label className="form-label">Subject Teacher *</label>
              <select
                className="form-select"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                required
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.lastName}, {t.firstName} ({t.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Day of Week */}
            <div className="form-group">
              <label className="form-label">Day of Week *</label>
              <select
                className="form-select"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Slot Inputs */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Start Time *</label>
                <input
                  type="time"
                  className="form-input"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">End Time *</label>
                <input
                  type="time"
                  className="form-input"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Room */}
            <div className="form-group">
              <label className="form-label">Classroom / Laboratory</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Room 204 or Science Lab 1"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>

            <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Checking Conflicts..." : slot ? "Update Period" : "Save to Schedule"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
