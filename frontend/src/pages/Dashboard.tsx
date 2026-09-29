import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { type AnalyticsOverview } from "@/types";
import { api } from "@/services/api";

/* ── Crisp Institutional SVG Icons (Matching UI_recommendation.png) ──────── */
const Icon = {
  Users: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  School: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="m4 6 8-4 8 4" />
      <path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2" />
      <path d="M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4" />
      <path d="M18 5v17" />
      <path d="M6 5v17" />
      <circle cx="12" cy="9" r="2" />
    </svg>
  ),
  FacultyStaff: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  ),
  Clock: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  TriangleAlert: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Calendar: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  GradeSheets: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  FileText: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Plus: () => (
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Sun: () => (
    <svg width="18" height="18" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="5" fill="#fde047" fillOpacity="0.4" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  BarChart: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  CheckCircle: () => (
    <svg width="14" height="14" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  Mail: () => (
    <svg width="14" height="14" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  Settings: () => (
    <svg width="14" height="14" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChartPoint, setActiveChartPoint] = useState<number | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.analytics.overview();
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load analytics dashboard";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const summary = data?.summary;

  // Real or demo fallback 7-day attendance trend
  const attendanceDays = [
    { day: "Sep 23", rate: 91.8 },
    { day: "Sep 24", rate: 92.5 },
    { day: "Sep 25", rate: 93.6 },
    { day: "Sep 26", rate: 92.8 },
    { day: "Sep 27", rate: 93.1 },
    { day: "Sep 28", rate: 94.0 },
    { day: "Sep 29", rate: 94.6 },
  ];

  // SVG Chart Geometry
  const chartW = 340;
  const chartH = 150;
  const padLeft = 32;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 26;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;
  const minRate = 80;
  const maxRate = 100;

  const points = attendanceDays.map((pt, i) => {
    const x = padLeft + (i / (attendanceDays.length - 1)) * plotW;
    const y = padTop + plotH - ((pt.rate - minRate) / (maxRate - minRate)) * plotH;
    return { ...pt, x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${padTop + plotH} L ${points[0].x.toFixed(1)} ${padTop + plotH} Z`;

  // Dual grouped bar chart data (Aug to Jun)
  const barMonths = [
    { m: "Aug", jhs: 15, shs: 18 },
    { m: "Sep", jhs: 16, shs: 20 },
    { m: "Oct", jhs: 18, shs: 21 },
    { m: "Nov", jhs: 19, shs: 23 },
    { m: "Dec", jhs: 20, shs: 25 },
    { m: "Jan", jhs: 20, shs: 24 },
    { m: "Feb", jhs: 21, shs: 26 },
    { m: "Mar", jhs: 22, shs: 28 },
    { m: "Apr", jhs: 23, shs: 30 },
    { m: "May", jhs: 24, shs: 32 },
    { m: "Jun", jhs: 25, shs: 33 },
  ];

  const barChartW = 420;
  const barChartH = 145;
  const barPadLeft = 24;
  const barPadRight = 12;
  const barPadTop = 12;
  const barPadBottom = 24;
  const barPlotW = barChartW - barPadLeft - barPadRight;
  const barPlotH = barChartH - barPadTop - barPadBottom;
  const barMax = 40;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", color: "#0f172a" }}>
      {/* ── Sub-Header Action Bar (Matching UI_recommendation.png) ──────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        {/* 4 Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
          {/* Button 1: Record Attendance */}
          <button
            type="button"
            onClick={() => navigate("/attendance")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.55rem",
              background: "#2563eb",
              color: "#ffffff",
              padding: "0.55rem 1.15rem",
              borderRadius: "9px",
              fontWeight: 600,
              fontSize: "0.825rem",
              border: "none",
              boxShadow: "0 2px 6px rgba(37,99,235,0.25)",
              cursor: "pointer",
              transition: "transform 0.15s ease",
            }}
          >
            <Icon.Calendar />
            <span>Record Attendance</span>
          </button>

          {/* Button 2: Grade Sheets */}
          <button
            type="button"
            onClick={() => navigate("/grading")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.55rem",
              background: "#8b5cf6",
              color: "#ffffff",
              padding: "0.55rem 1.15rem",
              borderRadius: "9px",
              fontWeight: 600,
              fontSize: "0.825rem",
              border: "none",
              boxShadow: "0 2px 6px rgba(139,92,246,0.25)",
              cursor: "pointer",
              transition: "transform 0.15s ease",
            }}
          >
            <Icon.GradeSheets />
            <span>Grade Sheets</span>
          </button>

          {/* Button 3: Process Enrollment */}
          <button
            type="button"
            onClick={() => navigate("/enrollments")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              background: "#10b981",
              color: "#ffffff",
              padding: "0.55rem 1.15rem",
              borderRadius: "9px",
              fontWeight: 600,
              fontSize: "0.825rem",
              border: "none",
              boxShadow: "0 2px 6px rgba(16,185,129,0.25)",
              cursor: "pointer",
              transition: "transform 0.15s ease",
            }}
          >
            <Icon.Plus />
            <span>Process Enrollment</span>
          </button>

          {/* Button 4: School Forms Hub */}
          <button
            type="button"
            onClick={() => navigate("/school-forms")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.55rem",
              background: "#ffffff",
              color: "#1e293b",
              padding: "0.55rem 1.15rem",
              borderRadius: "9px",
              fontWeight: 600,
              fontSize: "0.825rem",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              cursor: "pointer",
              transition: "background 0.15s ease",
            }}
          >
            <Icon.FileText />
            <span>School Forms Hub</span>
          </button>
        </div>

        {/* 2 Right-Hand Info Cards: Date & Weather */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Date Card */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "0.45rem 0.95rem",
              display: "flex",
              alignItems: "center",
              gap: "0.65rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ color: "#64748b" }}>
              <Icon.Calendar />
            </div>
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
                September 29, 2026
              </div>
              <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                Tuesday, 10:24 AM
              </div>
            </div>
          </div>

          {/* Weather Card */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "0.45rem 0.95rem",
              display: "flex",
              alignItems: "center",
              gap: "0.65rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <Icon.Sun />
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
                28°C
              </div>
              <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                Mostly Sunny
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "#fff1f2",
            border: "1px solid #fecdd3",
            borderRadius: "10px",
            padding: "0.75rem 1rem",
            color: "#e11d48",
            fontSize: "0.85rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>⚠️ {error}</span>
          <button
            onClick={fetchAnalytics}
            style={{
              background: "#e11d48",
              color: "#fff",
              border: "none",
              padding: "3px 10px",
              borderRadius: "6px",
              fontSize: "0.75rem",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Row 1: 5 Clean Elevated KPI Cards (Matching UI_recommendation.png) ──────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "1rem",
        }}
      >
        {/* KPI 1: Total Learners */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "1.1rem 1.2rem",
            border: "1px solid #e9edf4",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "0.75rem",
              }}
            >
              <Icon.Users />
            </div>
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: "0.35rem" }}>
              Total Learners
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
              {loading ? "..." : summary?.totalStudents ?? 36}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.3rem" }}>
              {loading ? "..." : summary?.enrolledStudents ?? 36} currently enrolled
            </div>
          </div>
          <div
            style={{
              fontSize: "0.725rem",
              fontWeight: 600,
              color: "#10b981",
              marginTop: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <span>↗</span>
            <span>+2 since last week</span>
          </div>
        </div>

        {/* KPI 2: Class Sections */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "1.1rem 1.2rem",
            border: "1px solid #e9edf4",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#f5f3ff",
                color: "#8b5cf6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "0.75rem",
              }}
            >
              <Icon.School />
            </div>
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: "0.35rem" }}>
              Class Sections
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
              {loading ? "..." : summary?.sectionsCount ?? 9}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.3rem" }}>
              JHS & SHS
            </div>
          </div>
          <div
            style={{
              fontSize: "0.725rem",
              fontWeight: 500,
              color: "#64748b",
              marginTop: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <span>⤳</span>
            <span>No change</span>
          </div>
        </div>

        {/* KPI 3: Faculty & Staff */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "1.1rem 1.2rem",
            border: "1px solid #e9edf4",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#ecfdf5",
                color: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "0.75rem",
              }}
            >
              <Icon.FacultyStaff />
            </div>
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: "0.35rem" }}>
              Faculty & Staff
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
              {loading ? "..." : summary?.facultyCount ?? 4}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.3rem" }}>
              Active personnel
            </div>
          </div>
          <div
            style={{
              fontSize: "0.725rem",
              fontWeight: 600,
              color: "#10b981",
              marginTop: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <span>↗</span>
            <span>+1 since last week</span>
          </div>
        </div>

        {/* KPI 4: School-Wide Attendance */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "1.1rem 1.2rem",
            border: "1px solid #e9edf4",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#f0fdf4",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "0.75rem",
              }}
            >
              <Icon.Clock />
            </div>
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: "0.35rem" }}>
              School-Wide Attendance
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#059669", lineHeight: 1.1 }}>
              {loading ? "..." : `${summary?.attendanceRate ?? 94.6}%`}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.3rem" }}>
              Average Daily Attendance (ADA)
            </div>
          </div>
          <div
            style={{
              fontSize: "0.725rem",
              fontWeight: 600,
              color: "#10b981",
              marginTop: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <span>↗</span>
            <span>+2.1% vs last week</span>
          </div>
        </div>

        {/* KPI 5: SARDO Critical Risks */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "1.1rem 1.2rem",
            border: "1px solid #e9edf4",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#fff1f2",
                color: "#e11d48",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "0.75rem",
              }}
            >
              <Icon.TriangleAlert />
            </div>
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: "0.35rem" }}>
              SARDO Critical Risks
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#e11d48", lineHeight: 1.1 }}>
              {loading ? "..." : summary?.criticalSardoCount ?? 0}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.3rem" }}>
              {summary?.moderateRiskCount ?? 2} Moderate Warnings
            </div>
          </div>
          <div
            style={{
              fontSize: "0.725rem",
              fontWeight: 600,
              color: "#6366f1",
              marginTop: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <span>↘</span>
            <span>-2 since last week</span>
          </div>
        </div>
      </div>

      {/* ── Row 2: Attendance Overview (42%) | Enrollment Distribution (28%) | Needs Attention (30%) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr 1.05fr",
          gap: "1.15rem",
          alignItems: "stretch",
        }}
      >
        {/* Card 1: Attendance Overview */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "1.25rem 1.4rem",
            border: "1px solid #e9edf4",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
              <span style={{ color: "#0f172a" }}>
                <Icon.Clock />
              </span>
              <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>
                Attendance Overview
              </span>
            </div>
            <button
              type="button"
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                padding: "3px 8px",
                fontSize: "0.75rem",
                color: "#64748b",
                cursor: "pointer",
              }}
            >
              Last 7 Days ▾
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem" }}>
            {/* Left: Line chart */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.35rem", fontWeight: 500 }}>
                Attendance Rate
              </div>
              <div style={{ position: "relative", width: "100%" }}>
                <svg
                  viewBox={`0 0 ${chartW} ${chartH}`}
                  style={{ width: "100%", height: "140px", overflow: "visible" }}
                >
                  <defs>
                    <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Guide lines */}
                  {[80, 85, 90, 95, 100].map((v) => {
                    const y = padTop + plotH - ((v - minRate) / (maxRate - minRate)) * plotH;
                    return (
                      <g key={v}>
                        <line
                          x1={padLeft}
                          y1={y}
                          x2={chartW - padRight}
                          y2={y}
                          stroke="#f1f5f9"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={padLeft - 6}
                          y={y + 3}
                          fill="#94a3b8"
                          fontSize="9"
                          textAnchor="end"
                          fontFamily="sans-serif"
                        >
                          {v}%
                        </text>
                      </g>
                    );
                  })}

                  {/* Gradient Area */}
                  <path d={areaPath} fill="url(#attGrad)" />

                  {/* Line */}
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Data Points */}
                  {points.map((p, idx) => (
                    <g key={p.day}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={activeChartPoint === idx ? 5.5 : 4}
                        fill="#2563eb"
                        stroke="#ffffff"
                        strokeWidth="2"
                        style={{ cursor: "pointer", transition: "all 0.15s ease" }}
                        onMouseEnter={() => setActiveChartPoint(idx)}
                        onMouseLeave={() => setActiveChartPoint(null)}
                      />
                      <text
                        x={p.x}
                        y={chartH - 8}
                        fill="#64748b"
                        fontSize="9"
                        textAnchor="middle"
                        fontWeight="500"
                      >
                        {p.day}
                      </text>
                    </g>
                  ))}
                </svg>

                {/* Tooltip on hover */}
                {activeChartPoint !== null && (
                  <div
                    style={{
                      position: "absolute",
                      left: `${(points[activeChartPoint].x / chartW) * 100}%`,
                      top: `${(points[activeChartPoint].y / chartH) * 100 - 32}%`,
                      transform: "translate(-50%, -100%)",
                      background: "#0f172a",
                      color: "#ffffff",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      fontSize: "0.72rem",
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                      zIndex: 10,
                    }}
                  >
                    <strong>{points[activeChartPoint].day}</strong>: {points[activeChartPoint].rate}%
                  </div>
                )}
              </div>
            </div>

            {/* Right: Big KPI Block */}
            <div
              style={{
                width: "140px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                paddingLeft: "0.75rem",
                borderLeft: "1px solid #f1f5f9",
                marginBottom: "0.75rem",
              }}
            >
              <div style={{ fontSize: "1.9rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
                94.6%
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                Today's Attendance
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: "#10b981",
                  marginTop: "0.55rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1px",
                }}
              >
                <span>↑ 2.1%</span>
                <span style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 400 }}>vs. last week</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Enrollment Distribution */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "1.25rem 1.4rem",
            border: "1px solid #e9edf4",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", marginBottom: "0.5rem" }}>
            <span style={{ color: "#0f172a" }}>
              <Icon.Users />
            </span>
            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>
              Enrollment Distribution
            </span>
          </div>

          {/* Donut and Legend */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", flex: 1 }}>
            {/* SVG Donut */}
            <div style={{ position: "relative", width: "135px", height: "135px" }}>
              <svg width="135" height="135" viewBox="0 0 135 135" style={{ transform: "rotate(-90deg)" }}>
                {/* Background Ring */}
                <circle cx="67.5" cy="67.5" r="48" fill="transparent" stroke="#f1f5f9" strokeWidth="18" />
                {/* JHS Arc (50%) -> Blue */}
                <circle
                  cx="67.5"
                  cy="67.5"
                  r="48"
                  fill="transparent"
                  stroke="#2563eb"
                  strokeWidth="18"
                  strokeDasharray="150.8 301.6"
                  strokeDashoffset="0"
                />
                {/* SHS Arc (50%) -> Purple */}
                <circle
                  cx="67.5"
                  cy="67.5"
                  r="48"
                  fill="transparent"
                  stroke="#8b5cf6"
                  strokeWidth="18"
                  strokeDasharray="150.8 301.6"
                  strokeDashoffset="-150.8"
                />
              </svg>

              {/* Center Metric */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                <span style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>
                  36
                </span>
                <span style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "2px" }}>
                  Total Learners
                </span>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.45rem" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2563eb", marginTop: "4px" }} />
                <div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a" }}>JHS</div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b" }}>18 (50%)</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.45rem" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#8b5cf6", marginTop: "4px" }} />
                <div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a" }}>SHS</div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b" }}>18 (50%)</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Needs Attention */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "1.25rem 1.4rem",
            border: "1px solid #e9edf4",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <span style={{ color: "#e11d48" }}>
                <Icon.TriangleAlert />
              </span>
              <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>
                Needs Attention
              </span>
            </div>
            <Link to="/attendance" style={{ fontSize: "0.75rem", fontWeight: 600, color: "#2563eb", textDecoration: "none" }}>
              View All
            </Link>
          </div>

          {/* 4 Action Items */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", flex: 1, justifyContent: "space-around" }}>
            {/* Item 1: Prolonged Absence */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                <div
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    background: "#fee2e2",
                    color: "#ef4444",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon.Users />
                </div>
                <div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
                    3 Students with prolonged absence
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#64748b" }}>
                    Grade 8 – Section Rizal
                  </div>
                  <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>
                    Last attendance: Sep 24, 2026
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/attendance")}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  padding: "3px 8px",
                  fontSize: "0.7rem",
                  color: "#2563eb",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                View →
              </button>
            </div>

            {/* Item 2: Enrollment Applications Pending */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                <div
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    background: "#fef3c7",
                    color: "#f59e0b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon.FileText />
                </div>
                <div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
                    2 Enrollment applications pending
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#64748b" }}>
                    Awaiting document verification
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/enrollments")}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  padding: "3px 8px",
                  fontSize: "0.7rem",
                  color: "#2563eb",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                View →
              </button>
            </div>

            {/* Item 3: Incomplete Grade Sheets */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                <div
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    background: "#ffedd5",
                    color: "#ea580c",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon.GradeSheets />
                </div>
                <div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
                    5 Grade sheets incomplete
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#64748b" }}>
                    Quarter 1
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/grading")}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  padding: "3px 8px",
                  fontSize: "0.7rem",
                  color: "#2563eb",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                View →
              </button>
            </div>

            {/* Item 4: School Forms Due Soon */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                <div
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    background: "#e0f2fe",
                    color: "#0284c7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon.FileText />
                </div>
                <div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
                    3 School forms due soon
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#64748b" }}>
                    Submission deadline approaching
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/school-forms")}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  padding: "3px 8px",
                  fontSize: "0.7rem",
                  color: "#2563eb",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                View →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Enrollment Trend (42%) | Today's Overview (28%) | Recent Activities (30%) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr 1.05fr",
          gap: "1.15rem",
          alignItems: "stretch",
        }}
      >
        {/* Card 1: Enrollment Trend */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "1.25rem 1.4rem",
            border: "1px solid #e9edf4",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
              <span style={{ color: "#0f172a" }}>
                <Icon.BarChart />
              </span>
              <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>
                Enrollment Trend
              </span>
            </div>
            <button
              type="button"
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                padding: "3px 8px",
                fontSize: "0.75rem",
                color: "#64748b",
                cursor: "pointer",
              }}
            >
              This School Year ▾
            </button>
          </div>

          {/* Grouped Bar Chart */}
          <div style={{ position: "relative", width: "100%" }}>
            <svg
              viewBox={`0 0 ${barChartW} ${barChartH}`}
              style={{ width: "100%", height: "140px", overflow: "visible" }}
            >
              {/* Horizontal Grid lines (0, 10, 20, 30, 40) */}
              {[0, 10, 20, 30, 40].map((v) => {
                const y = barPadTop + barPlotH - (v / barMax) * barPlotH;
                return (
                  <g key={v}>
                    <line
                      x1={barPadLeft}
                      y1={y}
                      x2={barChartW - barPadRight}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeDasharray={v === 0 ? "none" : "3 3"}
                    />
                    <text
                      x={barPadLeft - 6}
                      y={y + 3}
                      fill="#94a3b8"
                      fontSize="9"
                      textAnchor="end"
                      fontFamily="sans-serif"
                    >
                      {v}
                    </text>
                  </g>
                );
              })}

              {/* Grouped Bars */}
              {barMonths.map((bm, i) => {
                const groupW = barPlotW / barMonths.length;
                const groupX = barPadLeft + i * groupW;
                const barWidth = 7;
                const gap = 3;
                const startX = groupX + (groupW - (barWidth * 2 + gap)) / 2;

                const jhsH = (bm.jhs / barMax) * barPlotH;
                const shsH = (bm.shs / barMax) * barPlotH;

                const jhsY = barPadTop + barPlotH - jhsH;
                const shsY = barPadTop + barPlotH - shsH;

                return (
                  <g key={bm.m}>
                    {/* JHS Bar (Blue) */}
                    <rect
                      x={startX}
                      y={jhsY}
                      width={barWidth}
                      height={jhsH}
                      rx="2"
                      fill="#3b82f6"
                    />
                    {/* SHS Bar (Purple) */}
                    <rect
                      x={startX + barWidth + gap}
                      y={shsY}
                      width={barWidth}
                      height={shsH}
                      rx="2"
                      fill="#a855f7"
                    />
                    {/* Month Label */}
                    <text
                      x={groupX + groupW / 2}
                      y={barChartH - 6}
                      fill="#64748b"
                      fontSize="8.5"
                      textAnchor="middle"
                      fontWeight="500"
                    >
                      {bm.m}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Bottom Legend */}
          <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginTop: "0.4rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: "#64748b" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6" }} />
              <span>JHS</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: "#64748b" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#a855f7" }} />
              <span>SHS</span>
            </div>
          </div>
        </div>

        {/* Card 2: Today's Overview */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "1.25rem 1.4rem",
            border: "1px solid #e9edf4",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <span style={{ color: "#0f172a" }}>
                  <Icon.Calendar />
                </span>
                <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>
                  Today's Overview
                </span>
              </div>
              <span style={{ fontSize: "0.72rem", color: "#64748b", background: "#f8fafc", padding: "2px 8px", borderRadius: "6px" }}>
                September 29, 2026
              </span>
            </div>

            {/* 3 Snapshot Stat Chips */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: "1rem" }}>
              <div style={{ background: "#f0fdf4", padding: "0.55rem 0.45rem", borderRadius: "8px", textAlign: "center" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", gap: "3px" }}>
                  <Icon.CheckCircle />
                  <span>94.6%</span>
                </div>
                <div style={{ fontSize: "0.65rem", color: "#64748b", marginTop: "2px" }}>
                  Attendance Rate
                </div>
              </div>

              <div style={{ background: "#eff6ff", padding: "0.55rem 0.45rem", borderRadius: "8px", textAlign: "center" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                  <span style={{ fontSize: "0.8rem" }}>🏫</span>
                  <span>9</span>
                </div>
                <div style={{ fontSize: "0.65rem", color: "#64748b", marginTop: "2px" }}>
                  Active Classes
                </div>
              </div>

              <div style={{ background: "#fdf4ff", padding: "0.55rem 0.45rem", borderRadius: "8px", textAlign: "center" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#c026d3", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                  <span style={{ fontSize: "0.8rem" }}>👥</span>
                  <span>4</span>
                </div>
                <div style={{ fontSize: "0.65rem", color: "#64748b", marginTop: "2px" }}>
                  Present Faculty
                </div>
              </div>
            </div>

            {/* Upcoming Subheading */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.65rem" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a" }}>Upcoming</span>
              <Link to="/schedules/teachers" style={{ fontSize: "0.72rem", color: "#2563eb", textDecoration: "none" }}>
                View All
              </Link>
            </div>

            {/* 3 Agenda items */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                  <div style={{ background: "#eff6ff", color: "#2563eb", padding: "3px 6px", borderRadius: "5px", fontSize: "0.68rem", fontWeight: 600 }}>
                    10:00 AM
                  </div>
                  <div>
                    <div style={{ fontSize: "0.76rem", fontWeight: 600, color: "#0f172a" }}>Faculty Meeting</div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b" }}>📍 Conference Room</div>
                  </div>
                </div>
                <div style={{ color: "#94a3b8" }}>
                  <Icon.ChevronRight />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                  <div style={{ background: "#eff6ff", color: "#2563eb", padding: "3px 6px", borderRadius: "5px", fontSize: "0.68rem", fontWeight: 600 }}>
                    1:30 PM
                  </div>
                  <div>
                    <div style={{ fontSize: "0.76rem", fontWeight: 600, color: "#0f172a" }}>Grade 10 Advisers Meeting</div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b" }}>📍 AVR Room</div>
                  </div>
                </div>
                <div style={{ color: "#94a3b8" }}>
                  <Icon.ChevronRight />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                  <div style={{ background: "#eff6ff", color: "#2563eb", padding: "3px 6px", borderRadius: "5px", fontSize: "0.68rem", fontWeight: 600 }}>
                    3:00 PM
                  </div>
                  <div>
                    <div style={{ fontSize: "0.76rem", fontWeight: 600, color: "#0f172a" }}>Enrollment Review</div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b" }}>📍 Principal's Office</div>
                  </div>
                </div>
                <div style={{ color: "#94a3b8" }}>
                  <Icon.ChevronRight />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Recent Activities */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "1.25rem 1.4rem",
            border: "1px solid #e9edf4",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <span style={{ color: "#0f172a" }}>
                  <Icon.Clock />
                </span>
                <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>
                  Recent Activities
                </span>
              </div>
              <Link to="/announcements" style={{ fontSize: "0.75rem", fontWeight: 600, color: "#2563eb", textDecoration: "none" }}>
                View All
              </Link>
            </div>

            {/* 5 Activity Feed Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
              {/* Item 1 */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "8px",
                      background: "#ecfdf5",
                      color: "#10b981",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon.FileText />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.76rem", fontWeight: 600, color: "#0f172a", lineHeight: 1.2 }}>
                      New enrollment application submitted
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b" }}>
                      Grade 7 – Section St. Teresa
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "0.68rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
                  2 hours ago
                </span>
              </div>

              {/* Item 2 */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "8px",
                      background: "#eff6ff",
                      color: "#2563eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon.Clock />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.76rem", fontWeight: 600, color: "#0f172a", lineHeight: 1.2 }}>
                      Attendance updated
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b" }}>
                      Grade 9 – Section Rizal
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "0.68rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
                  3 hours ago
                </span>
              </div>

              {/* Item 3 */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "8px",
                      background: "#f5f3ff",
                      color: "#8b5cf6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon.GradeSheets />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.76rem", fontWeight: 600, color: "#0f172a", lineHeight: 1.2 }}>
                      Grade sheet submitted
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b" }}>
                      Grade 10 – Section Newton
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "0.68rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
                  5 hours ago
                </span>
              </div>

              {/* Item 4 */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "8px",
                      background: "#eff6ff",
                      color: "#3b82f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon.Mail />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.76rem", fontWeight: 600, color: "#0f172a", lineHeight: 1.2 }}>
                      New message from Faculty
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b" }}>
                      Re: Meeting tomorrow
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "0.68rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
                  6 hours ago
                </span>
              </div>

              {/* Item 5 */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "8px",
                      background: "#f1f5f9",
                      color: "#475569",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon.Settings />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.76rem", fontWeight: 600, color: "#0f172a", lineHeight: 1.2 }}>
                      System backup completed
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b" }}>
                      Daily backup
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "0.68rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
                  8 hours ago
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
