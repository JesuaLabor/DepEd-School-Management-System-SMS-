import { useState } from "react";
import type { Strand } from "@/types";
import { STRAND_LABELS } from "@/types";
import { api } from "@/services/api";

interface Props {
  onClose: () => void;
  onDone:  () => void;
}

type Step = 0 | 1 | 2 | 3; // Select → Configure → Confirm → Done

const currentYear = new Date().getFullYear();
const SCHOOL_YEARS = Array.from({ length: 5 }, (_, i) => {
  const y = currentYear - 1 + i; return `${y}-${y + 1}`;
});
const STRANDS: Strand[] = ["academic", "tvl", "sports", "arts_design"];

export default function PromotionWizard({ onClose, onDone }: Props) {
  const [step,       setStep]       = useState<Step>(0);
  const [from,       setFrom]       = useState(SCHOOL_YEARS[1]);
  const [to,         setTo]         = useState(SCHOOL_YEARS[2]);
  const [gradeLevel, setGradeLevel] = useState("7");
  const [strand,     setStrand]     = useState<Strand>("academic");
  const [track,      setTrack]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState<{ promoted: number; message: string } | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  const grade  = Number(gradeLevel);
  const isGrad = grade === 12;
  const isSHS  = grade === 10; // promoting TO Grade 11 — needs strand

  const stepLabels = ["Select Grades", "Configure", "Confirm", "Done"];

  async function handlePromote() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.enrollments.bulkPromote({
        fromSchoolYear: from,
        toSchoolYear:   to,
        gradeLevel:     grade,
        strand:         isSHS ? strand : undefined,
        track:          isSHS ? track  : undefined,
      });
      setResult(res);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Promotion failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: "min(560px,95vw)" }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎓 Bulk Grade Promotion</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Step indicator */}
        <div className="wizard-steps mb-4">
          {stepLabels.map((l, i) => (
            <div key={l} className={`wizard-step${step === i ? " active" : step > i ? " done" : ""}`}>
              {l}
            </div>
          ))}
        </div>

        {error && <div className="alert alert-error mb-4">{error}</div>}

        {/* Step 0 — Select grades */}
        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="alert alert-info">
              This wizard creates pending enrollment records for all approved students at the
              selected grade level, promoting them to the next grade in the new school year.
              Grade 12 students will be marked as <strong>Graduated</strong>.
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">From School Year</label>
                <select className="form-select" value={from} onChange={e => setFrom(e.target.value)}>
                  {SCHOOL_YEARS.map(sy => <option key={sy} value={sy}>{sy}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">To School Year</label>
                <select className="form-select" value={to} onChange={e => setTo(e.target.value)}>
                  {SCHOOL_YEARS.map(sy => <option key={sy} value={sy}>{sy}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Grade Level to Promote FROM</label>
              <select className="form-select" value={gradeLevel}
                onChange={e => setGradeLevel(e.target.value)}>
                {[7,8,9,10,11,12].map(g => (
                  <option key={g} value={g}>
                    Grade {g} → {g < 12 ? `Grade ${g + 1}` : "Graduated"}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0 }}>
              <button className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={() => setStep(1)}>
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 1 — Configure (strand for Gr10→11) */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{
              padding: "1rem", background: "var(--clr-surface-2)",
              borderRadius: "var(--radius)", border: "1px solid var(--clr-border)",
              fontSize: "0.875rem", lineHeight: 1.6,
            }}>
              <div style={{ marginBottom: "0.5rem" }}>
                <strong>Promoting:</strong>{" "}
                All approved Grade {grade} students from{" "}
                <span style={{ color: "var(--clr-accent)" }}>{from}</span>
              </div>
              <div>
                <strong>Result:</strong>{" "}
                {isGrad
                  ? "Students will be marked as Graduated."
                  : `Pending enrollment records created for Grade ${grade + 1} in ${to}.`}
              </div>
            </div>

            {isSHS && !isGrad && (
              <>
                <div className="alert alert-info">
                  Since you're promoting Grade 10 → Grade 11, a default strand must be selected.
                  Individual strands can be overridden per-student afterward.
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Default Strand <span style={{ color: "var(--clr-danger)" }}>*</span></label>
                    <select className="form-select" value={strand}
                      onChange={e => setStrand(e.target.value as Strand)}>
                      {STRANDS.map(s => <option key={s} value={s}>{STRAND_LABELS[s]}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Default Track</label>
                    <input className="form-input" placeholder="e.g. STEM, HUMSS"
                      value={track} onChange={e => setTrack(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0 }}>
              <button className="btn btn-outline" onClick={() => setStep(0)}>← Back</button>
              <button className="btn btn-primary" onClick={() => setStep(2)}>
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Confirm */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="card" style={{ background: "var(--clr-surface-2)" }}>
              <div className="info-section-title">Promotion Summary</div>
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-label">From School Year</div>
                  <div className="info-value">{from}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">To School Year</div>
                  <div className="info-value">{isGrad ? "—" : to}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Source Grade</div>
                  <div className="info-value">Grade {grade}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Target Grade</div>
                  <div className="info-value">{isGrad ? "Graduated" : `Grade ${grade + 1}`}</div>
                </div>
                {isSHS && (
                  <div className="info-item">
                    <div className="info-label">Default Strand</div>
                    <div className="info-value">{STRAND_LABELS[strand]}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="alert alert-info">
              This will create <strong>pending</strong> enrollment records for all affected students.
              Each enrollment will need to be individually approved. This action{" "}
              <strong>cannot be undone</strong> for generated records.
            </div>

            <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0 }}>
              <button className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary" disabled={loading} onClick={handlePromote}>
                {loading ? "Promoting…" : "Confirm & Promote"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Done */}
        {step === 3 && result && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center", padding: "1rem 0" }}>
            <div style={{ fontSize: "3rem" }}>🎉</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                Promotion Complete!
              </div>
              <div style={{ color: "var(--clr-text-muted)", fontSize: "0.875rem" }}>
                <strong style={{ color: "var(--clr-success)", fontSize: "1.5rem" }}>{result.promoted}</strong>
                {" "}{result.message}.
              </div>
              <div className="text-muted text-sm mt-2">
                Newly created enrollment records are in <strong>Pending</strong> status
                and require individual approval.
              </div>
            </div>
            <button className="btn btn-primary" style={{ marginTop: "0.5rem" }} onClick={onDone}>
              View Enrollments
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
