import { useState, useEffect } from "react";
import { api } from "@/services/api";
import type { SectionWithAdviser, AdviserSummary, Strand } from "@/types";
import { STRAND_LABELS } from "@/types";

interface Props {
  section?: SectionWithAdviser | null;
  defaultGradeLevel?: number;
  defaultSchoolYear?: string;
  onClose: () => void;
  onSaved: () => void;
}

const GRADE_LEVELS = [7, 8, 9, 10, 11, 12];
const STRANDS: Strand[] = ["academic", "tvl", "sports", "arts_design"];

export default function CreateSectionModal({
  section,
  defaultGradeLevel = 7,
  defaultSchoolYear = "2024-2025",
  onClose,
  onSaved,
}: Props) {
  const isEditing = !!section;

  const [name, setName]             = useState<string>(section?.name || "");
  const [gradeLevel, setGradeLevel] = useState<number>(section?.gradeLevel || defaultGradeLevel);
  const [schoolYear, setSchoolYear] = useState<string>(section?.schoolYear || defaultSchoolYear);
  const [strand, setStrand]         = useState<Strand | undefined>(section?.strand || "academic");
  const [track, setTrack]           = useState<string>(section?.track || "");
  const [adviserId, setAdviserId]   = useState<string>(section?.adviserId || "");
  const [room, setRoom]             = useState<string>(section?.room || "");
  const [maxCapacity, setMaxCapacity] = useState<number>(section?.maxCapacity || 45);

  const [teachers, setTeachers]     = useState<AdviserSummary[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState<boolean>(true);
  const [saving, setSaving]         = useState<boolean>(false);
  const [error, setError]           = useState<string | null>(null);

  const isSHS = gradeLevel >= 11;

  useEffect(() => {
    api.sections
      .teachers()
      .then((res) => setTeachers(res.data || []))
      .catch(() => {})
      .finally(() => setLoadingTeachers(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Section name is required.");
      return;
    }
    if (!schoolYear.trim()) {
      setError("School year is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (isEditing && section) {
        await api.sections.update(section.id, {
          name: name.trim(),
          gradeLevel,
          schoolYear: schoolYear.trim(),
          strand: isSHS ? strand : undefined,
          track: isSHS ? track.trim() : undefined,
          adviserId: adviserId || undefined,
          room: room.trim() || undefined,
          maxCapacity: Number(maxCapacity),
        });
      } else {
        await api.sections.create({
          name: name.trim(),
          gradeLevel,
          schoolYear: schoolYear.trim(),
          strand: isSHS ? strand : undefined,
          track: isSHS ? track.trim() : undefined,
          adviserId: adviserId || undefined,
          room: room.trim() || undefined,
          maxCapacity: Number(maxCapacity),
        });
      }
      onSaved();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save section.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: "520px" }}>
        <div className="modal-header">
          <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
            {isEditing ? `Edit Section: ${section?.name}` : "Create New Section"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--clr-text-muted)", fontSize: "1.2rem", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 0 }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label className="form-label">Grade Level *</label>
              <select
                className="form-input"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(Number(e.target.value))}
                style={{ width: "100%" }}
                required
              >
                {GRADE_LEVELS.map((g) => (
                  <option key={g} value={g}>
                    Grade {g} {g >= 11 ? "(SHS)" : "(JHS)"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">School Year *</label>
              <input
                type="text"
                className="form-input"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                placeholder="e.g. 2024-2025"
                style={{ width: "100%" }}
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label">Section Name *</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rizal, Bonifacio, STEM-A, Diamond"
              style={{ width: "100%" }}
              required
            />
            <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", marginTop: "0.2rem", display: "block" }}>
              Must be unique per grade level and school year.
            </span>
          </div>

          {isSHS && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label className="form-label">Senior High Strand</label>
                <select
                  className="form-input"
                  value={strand}
                  onChange={(e) => setStrand(e.target.value as Strand)}
                  style={{ width: "100%" }}
                >
                  {STRANDS.map((s) => (
                    <option key={s} value={s}>
                      {STRAND_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Track / Specialization</label>
                <input
                  type="text"
                  className="form-input"
                  value={track}
                  onChange={(e) => setTrack(e.target.value)}
                  placeholder="e.g. STEM, HUMSS, ICT"
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          )}

          <div>
            <label className="form-label">Class Adviser (Teacher)</label>
            <select
              className="form-input"
              value={adviserId}
              onChange={(e) => setAdviserId(e.target.value)}
              style={{ width: "100%" }}
              disabled={loadingTeachers}
            >
              <option value="">-- No adviser assigned yet --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.lastName}, {t.firstName} ({t.email})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1rem" }}>
            <div>
              <label className="form-label">Room / Building</label>
              <input
                type="text"
                className="form-input"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. Bldg 1 - Room 204"
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label className="form-label">Classroom Capacity</label>
              <input
                type="number"
                className="form-input"
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(Number(e.target.value))}
                min={10}
                max={70}
                style={{ width: "100%" }}
                required
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.75rem" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? "Saving Section..." : isEditing ? "Update Section" : "Create Section"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
