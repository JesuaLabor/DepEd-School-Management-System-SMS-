import { useState } from "react";
import DailyAttendanceTab from "./DailyAttendanceTab";
import StudentHistoryTab  from "./StudentHistoryTab";
import AbsenceReportTab   from "./AbsenceReportTab";
import AbsenceAlertsTab   from "./AbsenceAlertsTab";

type Tab = "daily" | "history" | "report" | "alerts";

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<Tab>("daily");
  const [inspectStudentId, setInspectStudentId] = useState<string | null>(null);

  const handleInspectStudent = (studentId: string) => {
    setInspectStudentId(studentId);
    setActiveTab("history");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Page Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--clr-text-muted)", marginBottom: "0.25rem" }}>
            <span>School Operations</span>
            <span>/</span>
            <span style={{ color: "var(--clr-text)" }}>Attendance Management</span>
          </div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, color: "var(--clr-text)" }}>
            Attendance Tracking
          </h1>
          <p style={{ margin: "0.25rem 0 0 0", color: "var(--clr-text-muted)", fontSize: "0.9rem" }}>
            Record daily class attendance, review student attendance logs, and monitor SARDO truancy risk.
          </p>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--clr-border)", paddingBottom: "2px" }}>
        <button
          type="button"
          onClick={() => setActiveTab("daily")}
          style={{
            padding: "0.65rem 1.25rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            background: "none",
            border: "none",
            borderBottom: activeTab === "daily" ? "2px solid var(--clr-primary)" : "2px solid transparent",
            color: activeTab === "daily" ? "var(--clr-primary)" : "var(--clr-text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all var(--transition)",
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Daily Class Sheet
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          style={{
            padding: "0.65rem 1.25rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            background: "none",
            border: "none",
            borderBottom: activeTab === "history" ? "2px solid var(--clr-primary)" : "2px solid transparent",
            color: activeTab === "history" ? "var(--clr-primary)" : "var(--clr-text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all var(--transition)",
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Student History & Logs
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("report")}
          style={{
            padding: "0.65rem 1.25rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            background: "none",
            border: "none",
            borderBottom: activeTab === "report" ? "2px solid var(--clr-primary)" : "2px solid transparent",
            color: activeTab === "report" ? "var(--clr-primary)" : "var(--clr-text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all var(--transition)",
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          Truancy & Dropout Alert
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("alerts")}
          style={{
            padding: "0.65rem 1.25rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            background: "none",
            border: "none",
            borderBottom: activeTab === "alerts" ? "2px solid var(--clr-primary)" : "2px solid transparent",
            color: activeTab === "alerts" ? "var(--clr-primary)" : "var(--clr-text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all var(--transition)",
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          Guardian SMS Alerts
        </button>
      </div>

      {/* ── Active Tab View ── */}
      <div>
        {activeTab === "daily" && <DailyAttendanceTab />}
        {activeTab === "history" && <StudentHistoryTab initialStudentId={inspectStudentId} />}
        {activeTab === "report" && <AbsenceReportTab onInspectStudent={handleInspectStudent} />}
        {activeTab === "alerts" && <AbsenceAlertsTab />}
      </div>
    </div>
  );
}
