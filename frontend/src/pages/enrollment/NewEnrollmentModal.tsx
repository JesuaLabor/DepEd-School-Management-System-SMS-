import { useState, useEffect, useRef } from "react";
import type { Student, Strand, EnrollmentType } from "@/types";
import { STRAND_LABELS, ENROLLMENT_TYPE_LABELS } from "@/types";
import { api } from "@/services/api";

const STRANDS: Strand[] = ["academic", "tvl", "sports", "arts_design"];
const TYPES: EnrollmentType[] = ["new", "returning", "transferee"];

interface Props {
  schoolYear: string;
  onClose:    () => void;
  onCreated:  () => void;
}

export default function NewEnrollmentModal({ schoolYear, onClose, onCreated }: Props) {
  // Student picker state
  const [query,        setQuery]        = useState("");
  const [results,      setResults]      = useState<Student[]>([]);
  const [selected,     setSelected]     = useState<Student | null>(null);
  const [searching,    setSearching]    = useState(false);
  const [showResults,  setShowResults]  = useState(false);

  // Form state
  const [gradeLevel,   setGradeLevel]   = useState("");
  const [strand,       setStrand]       = useState<Strand>("academic");
  const [track,        setTrack]        = useState("");
  const [type,         setType]         = useState<EnrollmentType>("returning");
  const [remarks,      setRemarks]      = useState("");

  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const pickerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
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
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.students.list({ search: query, limit: 8 });
        setResults(res.data);
        setShowResults(true);
      } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // Pre-fill grade level when student is selected
  useEffect(() => {
    if (selected) {
      setGradeLevel(String(selected.gradeLevel));
      if (selected.strand) setStrand(selected.strand);
    }
  }, [selected]);

  const isSHS = Number(gradeLevel) >= 11;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) { setError("Please select a student."); return; }
    if (!gradeLevel) { setError("Grade level is required."); return; }
    setError(null);
    setLoading(true);
    try {
      await api.enrollments.create({
        studentId:  selected.id,
        schoolYear,
        gradeLevel: Number(gradeLevel),
        strand:     isSHS ? strand : undefined,
        track:      isSHS ? track  : undefined,
        type,
        remarks:    remarks || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create enrollment");
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: "min(520px,95vw)" }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Enrollment Application</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert alert-error mb-4">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Student picker */}
          <div className="form-group" ref={pickerRef}>
            <label className="form-label">
              Student <span style={{ color: "var(--clr-danger)" }}>*</span>
            </label>
            {selected ? (
              <div style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                background: "var(--clr-surface-2)", border: "1px solid var(--clr-border)",
                borderRadius: "var(--radius-sm)", padding: "0.5rem 0.85rem",
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: selected.sex === "Female"
                    ? "linear-gradient(135deg,#db2777,#f43f5e)"
                    : "linear-gradient(135deg,#2563eb,#0ea5e9)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.7rem", fontWeight: 700, color: "#fff", flexShrink: 0,
                }}>
                  {selected.firstName[0]}{selected.lastName[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                    {selected.lastName}, {selected.firstName}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>
                    LRN: {selected.lrn} · Grade {selected.gradeLevel}
                  </div>
                </div>
                <button type="button" className="btn btn-ghost btn-sm"
                  onClick={() => { setSelected(null); setQuery(""); }}>
                  ✕
                </button>
              </div>
            ) : (
              <div className="student-picker">
                <input
                  className="form-input"
                  placeholder="Type student name or LRN to search…"
                  value={query} onChange={e => setQuery(e.target.value)}
                  onFocus={() => results.length > 0 && setShowResults(true)}
                />
                {searching && (
                  <div style={{ position: "absolute", right: 10, top: 10 }}>
                    <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  </div>
                )}
                {showResults && results.length > 0 && (
                  <div className="student-picker-results">
                    {results.map(s => (
                      <div key={s.id} className="student-picker-item"
                        onClick={() => { setSelected(s); setShowResults(false); setQuery(""); }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: "50%",
                          background: s.sex === "Female"
                            ? "linear-gradient(135deg,#db2777,#f43f5e)"
                            : "linear-gradient(135deg,#2563eb,#0ea5e9)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.65rem", fontWeight: 700, color: "#fff", flexShrink: 0,
                        }}>
                          {s.firstName[0]}{s.lastName[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: "0.875rem" }}>
                            {s.lastName}, {s.firstName}
                          </div>
                          <div className="lrn">{s.lrn} · Grade {s.gradeLevel} · {s.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* School Year (read-only) */}
          <div className="form-group">
            <label className="form-label">School Year</label>
            <input className="form-input" value={schoolYear} readOnly
              style={{ opacity: 0.7, cursor: "not-allowed" }} />
          </div>

          <div className="grid-2">
            {/* Grade Level */}
            <div className="form-group">
              <label className="form-label">
                Grade Level <span style={{ color: "var(--clr-danger)" }}>*</span>
              </label>
              <select className="form-select" value={gradeLevel} required
                onChange={e => setGradeLevel(e.target.value)}>
                <option value="">Select grade</option>
                {[7,8,9,10,11,12].map(g => (
                  <option key={g} value={g}>Grade {g} {g <= 10 ? "(JHS)" : "(SHS)"}</option>
                ))}
              </select>
            </div>

            {/* Enrollment Type */}
            <div className="form-group">
              <label className="form-label">Enrollment Type</label>
              <select className="form-select" value={type}
                onChange={e => setType(e.target.value as EnrollmentType)}>
                {TYPES.map(t => <option key={t} value={t}>{ENROLLMENT_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
          </div>

          {/* SHS strand + track */}
          {isSHS && (
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Strand</label>
                <select className="form-select" value={strand}
                  onChange={e => setStrand(e.target.value as Strand)}>
                  {STRANDS.map(s => <option key={s} value={s}>{STRAND_LABELS[s]}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Track (optional)</label>
                <input className="form-input" placeholder="e.g. STEM, ABM, HUMSS"
                  value={track} onChange={e => setTrack(e.target.value)} />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Remarks (optional)</label>
            <textarea className="form-input" rows={2}
              placeholder="Any notes for this enrollment application…"
              value={remarks} onChange={e => setRemarks(e.target.value)} />
          </div>

          <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0, marginTop: 0 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Submitting…" : "Submit Enrollment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
