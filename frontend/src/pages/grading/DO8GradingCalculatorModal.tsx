import { useState, useEffect } from "react";
import type { GradingWeights, CalculateQuarterResponse, Strand } from "@/types";
import { api } from "@/services/api";

interface DO8GradingCalculatorModalProps {
  gradeLevel: number;
  subjectCode: string;
  subjectName: string;
  strand?: Strand | "";
  studentName?: string;
  studentLrn?: string;
  quarterLabel?: string;
  initialGrade?: number;
  onApply?: (grade: number) => void;
  onClose: () => void;
}

export default function DO8GradingCalculatorModal({
  gradeLevel,
  subjectCode,
  subjectName,
  strand,
  studentName,
  studentLrn,
  quarterLabel,
  onApply,
  onClose,
}: DO8GradingCalculatorModalProps) {
  const [weights, setWeights] = useState<GradingWeights | null>(null);
  const [loadingWeights, setLoadingWeights] = useState(true);

  // Raw Scores
  const [wwScore, setWwScore] = useState<string>("85");
  const [wwTotal, setWwTotal] = useState<string>("100");

  const [ptScore, setPtScore] = useState<string>("90");
  const [ptTotal, setPtTotal] = useState<string>("100");

  const [qaScore, setQaScore] = useState<string>("42");
  const [qaTotal, setQaTotal] = useState<string>("50");

  const [result, setResult] = useState<CalculateQuarterResponse | null>(null);
  const [calculating, setCalculating] = useState(false);

  // Fetch DO 8 weights for this subject
  useEffect(() => {
    setLoadingWeights(true);
    api.grades.weights(gradeLevel, subjectCode, strand || undefined)
      .then(setWeights)
      .catch(() => {
        // Fallback default weights
        setWeights({
          writtenWork: 30,
          performanceTask: 50,
          quarterlyAssessment: 20,
          groupClassification: "Standard DepEd Curriculum (30-50-20)",
        });
      })
      .finally(() => setLoadingWeights(false));
  }, [gradeLevel, subjectCode, strand]);

  // Recalculate when scores change
  useEffect(() => {
    const ws = parseFloat(wwScore) || 0;
    const wt = parseFloat(wwTotal) || 0;
    const ps = parseFloat(ptScore) || 0;
    const pt = parseFloat(ptTotal) || 0;
    const qs = parseFloat(qaScore) || 0;
    const qt = parseFloat(qaTotal) || 0;

    if (wt <= 0 && pt <= 0 && qt <= 0) {
      setResult(null);
      return;
    }

    setCalculating(true);
    const timer = setTimeout(() => {
      api.grades.calculate({
        gradeLevel,
        subjectCode,
        strand: strand || undefined,
        wwScore: ws,
        wwTotal: wt,
        ptScore: ps,
        ptTotal: pt,
        qaScore: qs,
        qaTotal: qt,
      })
        .then(setResult)
        .catch(() => setResult(null))
        .finally(() => setCalculating(false));
    }, 150);

    return () => clearTimeout(timer);
  }, [gradeLevel, subjectCode, strand, wwScore, wwTotal, ptScore, ptTotal, qaScore, qaTotal]);

  const handleApply = () => {
    if (result && onApply) {
      onApply(result.transmutedGrade);
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 640, maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: "1.25rem", margin: 0 }}>
              DepEd Order No. 8, s. 2015 Grade Calculator
            </h2>
            <div style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)", marginTop: "2px" }}>
              {subjectName} ({subjectCode}) • Grade {gradeLevel} {strand ? `(${strand.toUpperCase()})` : ""}
              {quarterLabel ? ` • ${quarterLabel.toUpperCase()}` : ""}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {studentName && (
          <div style={{
            background: "var(--clr-surface-2, #f8fafc)",
            padding: "0.75rem 1rem",
            borderRadius: "var(--radius-sm)",
            marginBottom: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.85rem",
          }}>
            <div>
              <span style={{ color: "var(--clr-text-muted)" }}>Target Learner: </span>
              <strong>{studentName}</strong>
            </div>
            {studentLrn && (
              <span style={{ fontFamily: "monospace", color: "var(--clr-primary)" }}>
                LRN: {studentLrn}
              </span>
            )}
          </div>
        )}

        {/* Weights Banner */}
        <div style={{
          border: "1px solid var(--clr-border, #e2e8f0)",
          borderRadius: "var(--radius-sm)",
          padding: "0.85rem",
          marginBottom: "1.25rem",
          background: "linear-gradient(135deg, rgba(37,99,235,0.04), rgba(14,165,233,0.04))",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--clr-primary)" }}>
              Official Learning Area Assessment Weights
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--clr-text-muted)" }}>
              DO 8, s. 2015
            </span>
          </div>

          {loadingWeights ? (
            <div style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)" }}>Loading weights...</div>
          ) : weights ? (
            <div>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "0.25rem 0.6rem", borderRadius: "4px", fontSize: "0.8rem" }}>
                  <strong>Written Work (WW):</strong> {weights.writtenWork}%
                </div>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "0.25rem 0.6rem", borderRadius: "4px", fontSize: "0.8rem" }}>
                  <strong>Performance Tasks (PT):</strong> {weights.performanceTask}%
                </div>
                <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", padding: "0.25rem 0.6rem", borderRadius: "4px", fontSize: "0.8rem" }}>
                  <strong>Quarterly Assessment (QA):</strong> {weights.quarterlyAssessment}%
                </div>
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--clr-text-muted)" }}>
                Classification: <em>{weights.groupClassification}</em>
              </div>
            </div>
          ) : null}
        </div>

        {/* Raw Scores Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.25rem" }}>
          {/* Written Work */}
          <div style={{ background: "var(--clr-surface, #fff)", border: "1px solid var(--clr-border, #e2e8f0)", borderRadius: "var(--radius-sm)", padding: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
              <strong style={{ fontSize: "0.85rem" }}>1. Written Work (WW) — {weights?.writtenWork || 30}%</strong>
              {result?.breakdown.writtenWork && (
                <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>
                  PS: <strong>{result.breakdown.writtenWork.ps.toFixed(2)}%</strong> | WS: <strong style={{ color: "var(--clr-primary)" }}>{result.breakdown.writtenWork.ws.toFixed(2)}</strong>
                </span>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: "0.72rem" }}>Raw Learner Score</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-input"
                  placeholder="e.g. 85"
                  value={wwScore}
                  onChange={(e) => setWwScore(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: "0.72rem" }}>Highest Possible Score (HPS)</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-input"
                  placeholder="e.g. 100"
                  value={wwTotal}
                  onChange={(e) => setWwTotal(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Performance Tasks */}
          <div style={{ background: "var(--clr-surface, #fff)", border: "1px solid var(--clr-border, #e2e8f0)", borderRadius: "var(--radius-sm)", padding: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
              <strong style={{ fontSize: "0.85rem" }}>2. Performance Tasks (PT) — {weights?.performanceTask || 50}%</strong>
              {result?.breakdown.performanceTask && (
                <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>
                  PS: <strong>{result.breakdown.performanceTask.ps.toFixed(2)}%</strong> | WS: <strong style={{ color: "var(--clr-primary)" }}>{result.breakdown.performanceTask.ws.toFixed(2)}</strong>
                </span>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: "0.72rem" }}>Raw Learner Score</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-input"
                  placeholder="e.g. 90"
                  value={ptScore}
                  onChange={(e) => setPtScore(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: "0.72rem" }}>Highest Possible Score (HPS)</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-input"
                  placeholder="e.g. 100"
                  value={ptTotal}
                  onChange={(e) => setPtTotal(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Quarterly Assessment */}
          <div style={{ background: "var(--clr-surface, #fff)", border: "1px solid var(--clr-border, #e2e8f0)", borderRadius: "var(--radius-sm)", padding: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
              <strong style={{ fontSize: "0.85rem" }}>3. Quarterly Assessment (QA) — {weights?.quarterlyAssessment || 20}%</strong>
              {result?.breakdown.quarterlyAssessment && (
                <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>
                  PS: <strong>{result.breakdown.quarterlyAssessment.ps.toFixed(2)}%</strong> | WS: <strong style={{ color: "var(--clr-primary)" }}>{result.breakdown.quarterlyAssessment.ws.toFixed(2)}</strong>
                </span>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: "0.72rem" }}>Raw Exam Score</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-input"
                  placeholder="e.g. 42"
                  value={qaScore}
                  onChange={(e) => setQaScore(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: "0.72rem" }}>Total Items / HPS</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-input"
                  placeholder="e.g. 50"
                  value={qaTotal}
                  onChange={(e) => setQaTotal(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Calculation Result Summary */}
        {result && (
          <div style={{
            background: result.passed ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${result.passed ? "var(--clr-success)" : "var(--clr-danger)"}`,
            borderRadius: "var(--radius-sm)",
            padding: "1rem",
            marginBottom: "1rem",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>Initial Computed Grade (Raw Weighted)</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--clr-text)" }}>
                {result.initialGrade.toFixed(2)}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--clr-text-muted)", marginTop: "2px" }}>
                Formula: WS(WW) + WS(PT) + WS(QA)
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>Transmuted Quarterly Rating</div>
              <div style={{ fontSize: "2rem", fontWeight: 900, color: result.passed ? "var(--clr-success)" : "var(--clr-danger)" }}>
                {result.transmutedGrade}
              </div>
              <span className={`badge ${result.passed ? "badge-success" : "badge-danger"}`}>
                {result.descriptor} ({result.passed ? "Passed" : "Failed"})
              </span>
            </div>
          </div>
        )}

        <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between" }}>
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          {onApply && result ? (
            <button
              className="btn btn-primary"
              disabled={calculating}
              onClick={handleApply}
            >
              ✓ Apply Transmuted Grade ({result.transmutedGrade}) to Sheet
            </button>
          ) : (
            <button className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
