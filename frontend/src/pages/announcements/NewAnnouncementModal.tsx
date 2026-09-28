import { useState, useEffect } from "react";
import { api } from "@/services/api";
import type { Announcement, AnnouncementPriority, AnnouncementScope, SectionWithAdviser } from "@/types";

interface Props {
  announcement?: Announcement | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewAnnouncementModal({ announcement, onClose, onSuccess }: Props) {
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [content, setContent] = useState(announcement?.content ?? "");
  const [scope, setScope] = useState<AnnouncementScope>(announcement?.scope ?? "school_wide");
  const [priority, setPriority] = useState<AnnouncementPriority>(announcement?.priority ?? "normal");
  const [targetGrade, setTargetGrade] = useState<number | undefined>(announcement?.targetGrade);
  const [targetSection, setTargetSection] = useState<string | undefined>(announcement?.targetSection);
  const [isPinned, setIsPinned] = useState<boolean>(announcement?.isPinned ?? false);

  const [sections, setSections] = useState<SectionWithAdviser[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (scope === "section") {
      api.sections.list().then((res) => {
        setSections(res.data || []);
      }).catch(() => {});
    }
  }, [scope]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError("Please fill in both the title and message content.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        title: title.trim(),
        content: content.trim(),
        scope,
        priority,
        targetGrade: scope === "grade_level" ? targetGrade : undefined,
        targetSection: scope === "section" ? targetSection : undefined,
        isPinned,
      };

      if (announcement) {
        await api.announcements.update(announcement.id, payload);
      } else {
        await api.announcements.create(payload);
      }

      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save announcement.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: "620px" }}>
        <div className="modal-header">
          <h2>{announcement ? "✏️ Edit Announcement" : "📢 New School Bulletin Announcement"}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {error && (
            <div className="badge badge-danger" style={{ padding: "0.5rem 0.75rem", borderRadius: "6px" }}>
              ⚠️ {error}
            </div>
          )}

          {/* Title */}
          <div className="form-group">
            <label className="form-label">Announcement Title *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Schedule of 1st Quarter Examination & Parent-Teacher Conference"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Scope and Priority Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Target Scope</label>
              <select
                className="form-select"
                value={scope}
                onChange={(e) => setScope(e.target.value as AnnouncementScope)}
              >
                <option value="school_wide">🌐 School-Wide (Everyone)</option>
                <option value="jhs">🏫 Junior High School (Grades 7–10)</option>
                <option value="shs">🎓 Senior High School (Grades 11–12)</option>
                <option value="grade_level">🎯 Specific Grade Level</option>
                <option value="section">👥 Specific Class Section</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Priority Level</label>
              <select
                className="form-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
              >
                <option value="normal">ℹ️ Normal Notice</option>
                <option value="advisory">⚠️ DepEd Advisory</option>
                <option value="urgent">🚨 Urgent Bulletin</option>
              </select>
            </div>
          </div>

          {/* Conditional Target Selectors */}
          {scope === "grade_level" && (
            <div className="form-group">
              <label className="form-label">Select Grade Level</label>
              <select
                className="form-select"
                value={targetGrade ?? 7}
                onChange={(e) => setTargetGrade(Number(e.target.value))}
              >
                {[7, 8, 9, 10, 11, 12].map((g) => (
                  <option key={g} value={g}>
                    Grade {g} {g <= 10 ? "(JHS)" : "(SHS)"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {scope === "section" && (
            <div className="form-group">
              <label className="form-label">Select Section</label>
              <select
                className="form-select"
                value={targetSection ?? ""}
                onChange={(e) => setTargetSection(e.target.value)}
                required
              >
                <option value="">-- Choose Section --</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    Grade {s.gradeLevel} - {s.name} ({s.adviser ? `${s.adviser.lastName}, ${s.adviser.firstName}` : "No Adviser"})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Pin Checkbox */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="checkbox"
              id="isPinned"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              style={{ cursor: "pointer", width: "16px", height: "16px" }}
            />
            <label htmlFor="isPinned" style={{ fontSize: "0.85rem", cursor: "pointer", fontWeight: 500 }}>
              📌 Pin this announcement to the top of the bulletin feed
            </label>
          </div>

          {/* Content */}
          <div className="form-group">
            <label className="form-label">Message Details *</label>
            <textarea
              className="form-input"
              rows={6}
              placeholder="Enter comprehensive announcement content, guidelines, dates, or DepEd memorandum references..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          {/* Footer Buttons */}
          <div className="modal-footer" style={{ marginTop: "0.5rem", display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Publishing..." : announcement ? "Save Changes" : "📢 Publish Announcement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
