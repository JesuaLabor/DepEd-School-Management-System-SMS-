import { useEffect, useState } from "react";
import { api } from "@/services/api";
import type { AbsenceAlert } from "@/types";

export default function AbsenceAlertsTab() {
  const [alerts, setAlerts] = useState<AbsenceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedAlert, setSelectedAlert] = useState<AbsenceAlert | null>(null);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const handleResend = async () => {
    if (!selectedAlert || !selectedAlert.guardianContact) return;
    setResending(true);
    setResendStatus(null);
    try {
      const res = await api.attendance.sendSMS({
        recipient: selectedAlert.guardianContact,
        message: selectedAlert.message || "DepEd Absence Alert Notice",
        studentId: selectedAlert.studentId,
      });
      setResendStatus(`✓ Dispatched via ${res.provider.toUpperCase()} (${res.status})`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to dispatch SMS";
      setResendStatus(`✕ ${msg}`);
    } finally {
      setResending(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.attendance.alerts({
        date: dateFilter || undefined,
        limit: 100,
      });
      setAlerts(res.data || []);
    } catch (err) {
      console.error("Failed to load absence alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [dateFilter]);

  const filteredAlerts = alerts.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const lrn = a.lrn || a.studentLrn || "";
    return (
      a.studentName?.toLowerCase().includes(q) ||
      lrn.includes(q) ||
      a.guardianName?.toLowerCase().includes(q) ||
      a.guardianContact?.includes(q) ||
      a.message?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── KPI & Summary Banner ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        <div className="card" style={{ padding: "1.25rem", borderLeft: "4px solid var(--clr-primary)" }}>
          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--clr-text-muted)", fontWeight: 600 }}>
            Total Absence Alerts
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, marginTop: "0.25rem" }}>
            {alerts.length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", marginTop: "0.25rem" }}>
            Automated SMS notifications dispatched
          </div>
        </div>

        <div className="card" style={{ padding: "1.25rem", borderLeft: "4px solid var(--clr-success)" }}>
          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--clr-text-muted)", fontWeight: 600 }}>
            Dispatch Channel
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--clr-success)", marginTop: "0.25rem" }}>
            SMS Gateway
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", marginTop: "0.25rem" }}>
            DepEd automated mobile delivery
          </div>
        </div>

        <div className="card" style={{ padding: "1.25rem", borderLeft: "4px solid var(--clr-accent)" }}>
          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--clr-text-muted)", fontWeight: 600 }}>
            SARDO Prevention
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--clr-accent)", marginTop: "0.25rem" }}>
            Real-Time
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", marginTop: "0.25rem" }}>
            Triggers immediately upon saving "Absent"
          </div>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div className="card" style={{ padding: "1rem 1.25rem" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center", flex: 1 }}>
            <input
              type="text"
              placeholder="Search by learner name, LRN, guardian name, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1, minWidth: "260px", padding: "0.55rem 0.85rem",
                borderRadius: "var(--radius-sm)", background: "var(--clr-surface-2)",
                border: "1px solid var(--clr-border)", color: "var(--clr-text)", fontSize: "0.85rem"
              }}
            />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{
                padding: "0.55rem 0.75rem", borderRadius: "var(--radius-sm)",
                background: "var(--clr-surface-2)", border: "1px solid var(--clr-border)",
                color: "var(--clr-text)", fontSize: "0.85rem"
              }}
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter("")}
                style={{
                  background: "transparent", border: "1px solid var(--clr-border)",
                  color: "var(--clr-text-muted)", padding: "0.45rem 0.75rem",
                  borderRadius: "var(--radius-sm)", fontSize: "0.8rem"
                }}
              >
                Clear Date
              </button>
            )}
          </div>

          <button
            onClick={fetchAlerts}
            style={{
              padding: "0.55rem 1rem", borderRadius: "var(--radius-sm)",
              background: "var(--clr-surface-2)", border: "1px solid var(--clr-border)",
              color: "var(--clr-text)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem"
            }}
          >
            ↻ Refresh Log
          </button>
        </div>
      </div>

      {/* ── Alerts Dispatch Table ── */}
      <div className="card" style={{ overflow: "hidden", padding: 0 }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--clr-text-muted)" }}>
            <div className="spinner" style={{ margin: "0 auto 1rem" }} />
            <span>Loading absence alert dispatches...</span>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "var(--clr-text-muted)" }}>
            <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📱</p>
            <strong style={{ color: "var(--clr-text)", display: "block", marginBottom: "0.25rem" }}>
              No Absence Alerts Recorded
            </strong>
            <p style={{ fontSize: "0.85rem", maxWidth: "450px", margin: "0 auto" }}>
              When a teacher or adviser records an "Absent" mark on the Daily Class Attendance Sheet, an automated SMS alert is queued and dispatched to the student's guardian.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "var(--clr-surface-2)", borderBottom: "1px solid var(--clr-border)", textAlign: "left" }}>
                  <th style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "var(--clr-text-muted)" }}>Date / Time</th>
                  <th style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "var(--clr-text-muted)" }}>Learner (LRN)</th>
                  <th style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "var(--clr-text-muted)" }}>Parent / Guardian</th>
                  <th style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "var(--clr-text-muted)" }}>Contact Number</th>
                  <th style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "var(--clr-text-muted)" }}>Channel</th>
                  <th style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "var(--clr-text-muted)" }}>Status</th>
                  <th style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "var(--clr-text-muted)", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((a) => (
                  <tr key={a.id} style={{ borderBottom: "1px solid var(--clr-border-soft)" }}>
                    <td style={{ padding: "0.85rem 1rem", whiteSpace: "nowrap" }}>
                      <strong style={{ display: "block", color: "var(--clr-text)" }}>{a.date ? a.date.split("T")[0] : ""}</strong>
                      <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>
                        {new Date(a.sentAt || a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <strong style={{ color: "var(--clr-text)" }}>{a.studentName}</strong>
                      <div style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "var(--clr-accent)" }}>
                        LRN: {a.lrn || a.studentLrn}
                      </div>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", color: "var(--clr-text)" }}>
                      {a.guardianName || "—"}
                    </td>
                    <td style={{ padding: "0.85rem 1rem", fontFamily: "monospace", color: "var(--clr-text-muted)" }}>
                      {a.guardianContact || "No mobile registered"}
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <span
                        style={{
                          fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.5rem",
                          borderRadius: "4px", background: "rgba(37,99,235,0.15)", color: "#60a5fa",
                          border: "1px solid rgba(37,99,235,0.3)", textTransform: "uppercase"
                        }}
                      >
                        {a.channel}
                      </span>
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <span
                        style={{
                          fontSize: "0.75rem", fontWeight: 600, padding: "0.2rem 0.5rem",
                          borderRadius: "12px", background: "rgba(34,197,94,0.12)", color: "#4ade80",
                          border: "1px solid rgba(34,197,94,0.3)"
                        }}
                      >
                        ✓ {a.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                      <button
                        onClick={() => setSelectedAlert(a)}
                        style={{
                          background: "var(--clr-surface-2)", border: "1px solid var(--clr-border)",
                          color: "var(--clr-text)", padding: "0.3rem 0.65rem", borderRadius: "var(--radius-sm)",
                          fontSize: "0.75rem", cursor: "pointer"
                        }}
                      >
                        View SMS
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── View SMS Message Modal ── */}
      {selectedAlert && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem"
        }}>
          <div style={{
            background: "var(--clr-surface)", border: "1px solid var(--clr-border)",
            borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "500px",
            boxShadow: "var(--shadow-lg)", overflow: "hidden"
          }}>
            <div style={{
              padding: "1rem 1.25rem", borderBottom: "1px solid var(--clr-border)",
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <strong style={{ fontSize: "1rem", color: "var(--clr-text)" }}>
                📱 Absence SMS Notification Notice
              </strong>
              <button
                onClick={() => setSelectedAlert(null)}
                style={{ background: "none", border: "none", color: "var(--clr-text-muted)", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--clr-text-muted)" }}>
                <div>Recipient: <strong style={{ color: "var(--clr-text)" }}>{selectedAlert.guardianName}</strong> ({selectedAlert.guardianContact})</div>
                <div>Learner: <strong style={{ color: "var(--clr-text)" }}>{selectedAlert.studentName}</strong> (LRN: {selectedAlert.studentLrn})</div>
                <div>Date Marked: <strong style={{ color: "var(--clr-text)" }}>{selectedAlert.date}</strong></div>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--clr-text-muted)", textTransform: "uppercase" }}>
                  SMS Dispatch Message:
                </label>
                <div style={{
                  marginTop: "0.35rem", padding: "0.85rem", borderRadius: "var(--radius-sm)",
                  background: "var(--clr-surface-2)", border: "1px solid var(--clr-border)",
                  fontSize: "0.875rem", lineHeight: 1.5, color: "var(--clr-text)", fontFamily: "monospace"
                }}>
                  {selectedAlert.message}
                </div>
              </div>

              {resendStatus && (
                <div style={{
                  padding: "0.5rem 0.75rem", borderRadius: "var(--radius-sm)",
                  fontSize: "0.8rem", fontWeight: 600,
                  background: resendStatus.startsWith("✓") ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                  color: resendStatus.startsWith("✓") ? "#4ade80" : "#f87171",
                  border: `1px solid ${resendStatus.startsWith("✓") ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`
                }}>
                  {resendStatus}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || !selectedAlert.guardianContact}
                  className="btn btn-secondary"
                  style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem" }}
                >
                  {resending ? "Sending..." : "📲 Resend SMS Alert"}
                </button>
                <button
                  onClick={() => { setSelectedAlert(null); setResendStatus(null); }}
                  className="btn btn-primary"
                  style={{ padding: "0.45rem 1rem", fontSize: "0.85rem" }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
