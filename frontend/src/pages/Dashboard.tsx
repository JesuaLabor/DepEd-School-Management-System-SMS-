import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS, type AnalyticsOverview, type Announcement } from "@/types";
import { api } from "@/services/api";

/* ── Crisp Institutional SVG Icons (No raw emojis) ───────────────────────── */
const Icon = {
  GraduationCap: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  ),
  School: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="m4 6 8-4 8 4" /><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2" />
      <path d="M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4" /><path d="M18 5v17" /><path d="M6 5v17" />
      <circle cx="12" cy="9" r="2" />
    </svg>
  ),
  Users: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  ChartLine: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
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
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Clock: () => (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  ClipboardCheck: () => (
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  ),
  FileText: () => (
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  BookOpen: () => (
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  ArrowRight: () => (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  Plus: () => (
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  CheckCircle2: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChartPoint, setActiveChartPoint] = useState<number | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const [res, annRes] = await Promise.all([
        api.analytics.overview(),
        api.announcements.list({ limit: 3 }).catch(() => ({ data: [] })),
      ]);
      setData(res);
      setAnnouncements(annRes.data || []);
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

  // Time-based greeting helper
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // Formatted date string for Today's Overview
  const todayFormatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const summary = data?.summary;
  const gradeLevels = data?.gradeLevelDistribution || [];
  const maxGradeCount = Math.max(...gradeLevels.map((g) => g.total), 1);

  const totalMale = summary?.totalMale ?? 0;
  const totalFemale = summary?.totalFemale ?? 0;
  const totalGender = totalMale + totalFemale || 1;
  const malePct = Math.round((totalMale / totalGender) * 100);
  const femalePct = 100 - malePct;

  const perf = data?.gradePerformance;
  const totalGraded = perf?.totalGrades ?? 0;

  // 5-Day Attendance Data for Interactive Sparkline Chart
  const defaultWeekDays = [
    { day: "Mon", date: "Sept 25", rate: 92.4, present: 33, total: 36 },
    { day: "Tue", date: "Sept 26", rate: 94.1, present: 34, total: 36 },
    { day: "Wed", date: "Sept 27", rate: 96.2, present: 35, total: 36 },
    { day: "Thu", date: "Sept 28", rate: 95.0, present: 34, total: 36 },
    { day: "Fri", date: "Sept 29", rate: 94.6, present: 34, total: 36 },
  ];

  // If backend returned actual trend points, map them; otherwise use standard current week
  const trendPoints = data?.recentAttendanceTrend && data.recentAttendanceTrend.length >= 3
    ? data.recentAttendanceTrend.slice(-5).map((d, i) => {
        const parsed = new Date(d.date);
        const dayName = isNaN(parsed.getTime()) ? ["Mon", "Tue", "Wed", "Thu", "Fri"][i] : parsed.toLocaleDateString("en-US", { weekday: "short" });
        return {
          day: dayName,
          date: d.date,
          rate: d.attendanceRate,
          present: d.present,
          total: d.total,
        };
      })
    : defaultWeekDays;

  // SVG Chart Coordinate Calculations
  const chartW = 460;
  const chartH = 140;
  const padX = 35;
  const padY = 20;
  const usableW = chartW - padX * 2;
  const usableH = chartH - padY * 2;
  const minRate = 80;
  const maxRate = 100;

  const points = trendPoints.map((pt, i) => {
    const x = padX + (i / (trendPoints.length - 1)) * usableW;
    const y = padY + usableH - ((pt.rate - minRate) / (maxRate - minRate)) * usableH;
    return { ...pt, x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${chartH - padY} L ${points[0].x.toFixed(1)} ${chartH - padY} Z`;

  // Upcoming daily agenda items
  const upcomingEvents = [
    { time: "10:00 AM", title: "Faculty & Department Heads Briefing", venue: "AVR / Room 101" },
    { time: "1:30 PM", title: "Grade 10 Advisers Meeting", venue: "Conference Room" },
    { time: "3:00 PM", title: "Enrollment & SF1 Document Review", venue: "Registrar's Office" },
  ];

  return (
    <>
      {/* ── 1. Compact Welcome Section & Quick Action Navigation ──────────── */}
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          padding: "1.15rem 2rem 0.9rem",
          background: "linear-gradient(180deg, rgba(30, 64, 175, 0.08) 0%, transparent 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <img
            src="/knhs_logo.png"
            alt="KNHS Emblem"
            style={{
              width: "40px",
              height: "40px",
              objectFit: "contain",
              borderRadius: "50%",
              background: "#ffffff",
              padding: "2px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
              flexShrink: 0,
            }}
          />
          <div>
            <h1 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span>{greeting}, {user?.firstName || "Alejandro"}! 👋</span>
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--clr-text-muted)" }}>
              Kalilangan National High School · <span style={{ color: "var(--clr-accent-light)", fontWeight: 600 }}>{user ? ROLE_LABELS[user.role] : "Super Admin"}</span>
            </p>
          </div>
        </div>

        {/* Priority Quick Actions beside greeting */}
        <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", alignItems: "center" }}>
          {(user?.role === "super_admin" || user?.role === "registrar") && (
            <Link to="/enrollments" className="btn btn-accent btn-sm">
              <Icon.Plus />
              <span>Process Enrollment</span>
            </Link>
          )}
          <Link to="/attendance" className="btn btn-outline btn-sm">
            <Icon.ClipboardCheck />
            <span>Record Attendance</span>
          </Link>
          <Link to="/grading" className="btn btn-outline btn-sm">
            <Icon.BookOpen />
            <span>Grade Sheets</span>
          </Link>
          <Link to="/school-forms" className="btn btn-outline btn-sm">
            <Icon.FileText />
            <span>School Forms</span>
          </Link>
        </div>
      </div>

      <div className="page-body" style={{ paddingTop: "1.25rem" }}>
        {error && (
          <div className="card mb-4" style={{ borderLeft: "4px solid var(--clr-danger)", background: "rgba(220,38,38,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--clr-danger)", fontWeight: 500 }}>⚠️ {error}</span>
              <button className="btn btn-outline btn-sm" onClick={fetchAnalytics}>Retry</button>
            </div>
          </div>
        )}

        {/* ── 2. Compact 5-KPI Command Strip with Real SVG Icons ───────────── */}
        <div className="stats-grid-5 mb-6">
          {/* KPI 1: Total Learners */}
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Total Learners</span>
              <div className="stat-icon" style={{ background: "rgba(30, 64, 175, 0.25)", color: "var(--clr-primary-light)" }}>
                <Icon.GraduationCap />
              </div>
            </div>
            <div className="stat-value" style={{ color: "var(--clr-primary-light)" }}>
              {loading ? "..." : summary?.totalStudents ?? 36}
            </div>
            <div className="stat-subtext">
              <span style={{ fontWeight: 600, color: "var(--clr-text)" }}>
                {loading ? "..." : summary?.enrolledStudents ?? 36}
              </span>{" "}
              currently enrolled
            </div>
          </div>

          {/* KPI 2: Class Sections */}
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Class Sections</span>
              <div className="stat-icon" style={{ background: "rgba(245, 158, 11, 0.2)", color: "var(--clr-accent-light)" }}>
                <Icon.School />
              </div>
            </div>
            <div className="stat-value" style={{ color: "var(--clr-accent-light)" }}>
              {loading ? "..." : summary?.sectionsCount ?? 9}
            </div>
            <div className="stat-subtext">
              JHS & SHS Advisories
            </div>
          </div>

          {/* KPI 3: Faculty & Staff */}
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Faculty & Staff</span>
              <div className="stat-icon" style={{ background: "rgba(59, 130, 246, 0.2)", color: "#60a5fa" }}>
                <Icon.Users />
              </div>
            </div>
            <div className="stat-value" style={{ color: "#93c5fd" }}>
              {loading ? "..." : summary?.facultyCount ?? 4}
            </div>
            <div className="stat-subtext">
              Active personnel
            </div>
          </div>

          {/* KPI 4: Attendance (Elevated Priority Indicator) */}
          <div className="stat-card elevated-attendance">
            <div className="stat-header">
              <span className="stat-label" style={{ color: "var(--clr-success)" }}>Attendance</span>
              <div className="stat-icon" style={{ background: "rgba(22, 163, 74, 0.25)", color: "#4ade80" }}>
                <Icon.ChartLine />
              </div>
            </div>
            <div className="stat-value" style={{ color: "#4ade80" }}>
              {loading ? "..." : `${summary?.attendanceRate ?? 94.6}%`}
            </div>
            <div className="stat-subtext" style={{ color: "var(--clr-success)" }}>
              <span>+2.1%</span> vs last week · ADA
            </div>
          </div>

          {/* KPI 5: SARDO Risks (Elevated Action Indicator) */}
          <div className={`stat-card ${(summary?.criticalSardoCount ?? 0) > 0 ? "elevated-danger" : "elevated-sardo"}`}>
            <div className="stat-header">
              <span className="stat-label" style={{ color: (summary?.criticalSardoCount ?? 0) > 0 ? "var(--clr-danger)" : "var(--clr-warning)" }}>
                SARDO Risks
              </span>
              <div
                className="stat-icon"
                style={{
                  background: (summary?.criticalSardoCount ?? 0) > 0 ? "rgba(220, 38, 38, 0.25)" : "rgba(245, 158, 11, 0.2)",
                  color: (summary?.criticalSardoCount ?? 0) > 0 ? "#f87171" : "#fbbf24",
                }}
              >
                <Icon.TriangleAlert />
              </div>
            </div>
            <div className="stat-value" style={{ color: (summary?.criticalSardoCount ?? 0) > 0 ? "#f87171" : "#fbbf24" }}>
              {loading ? "..." : summary?.criticalSardoCount ?? 0}
            </div>
            <div className="stat-subtext">
              {loading ? "..." : `${summary?.moderateRiskCount ?? 2} moderate warning(s)`}
            </div>
          </div>
        </div>

        {/* ── 3 & 4. Primary Grid: Visual Analytics & Needs Attention ──────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
          
          {/* LEFT: Attendance Overview Chart */}
          <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div className="card-header" style={{ marginBottom: "0.75rem" }}>
                <div>
                  <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ color: "var(--clr-success)" }}><Icon.ChartLine /></span>
                    <span>Attendance Overview</span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", marginTop: "2px" }}>
                    5-Day School Week Attendance Trend (%) · Mon–Fri
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className="badge badge-success">
                    {summary?.attendanceRate ?? 94.6}% Average Rate
                  </span>
                </div>
              </div>

              {/* Responsive SVG Sparkline / Area Chart */}
              <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
                <svg
                  viewBox={`0 0 ${chartW} ${chartH}`}
                  style={{ width: "100%", height: "140px", overflow: "visible" }}
                >
                  <defs>
                    <linearGradient id="attendanceAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16a34a" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#16a34a" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {[85, 90, 95, 100].map((val) => {
                    const y = padY + usableH - ((val - minRate) / (maxRate - minRate)) * usableH;
                    return (
                      <g key={val}>
                        <line x1={padX} y1={y} x2={chartW - padX} y2={y} stroke="var(--clr-border-soft)" strokeDasharray="3 3" />
                        <text x={padX - 8} y={y + 3} fill="var(--clr-text-faint)" fontSize="9" textAnchor="end" fontFamily="monospace">
                          {val}%
                        </text>
                      </g>
                    );
                  })}

                  {/* Area fill */}
                  <path d={areaPath} fill="url(#attendanceAreaGrad)" />

                  {/* Chart Line */}
                  <path d={linePath} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                  {/* Interactive Data Dots & Day Labels */}
                  {points.map((p, idx) => (
                    <g key={p.day}>
                      <line x1={p.x} y1={chartH - padY} x2={p.x} y2={chartH - padY + 4} stroke="var(--clr-border)" />
                      <text x={p.x} y={chartH - 4} fill="var(--clr-text-muted)" fontSize="10" textAnchor="middle" fontWeight="600">
                        {p.day}
                      </text>
                      
                      {/* Outer pulse on active/hover */}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={activeChartPoint === idx ? 7 : 4.5}
                        fill="#22c55e"
                        stroke="var(--clr-surface)"
                        strokeWidth="2"
                        style={{ cursor: "pointer", transition: "all 0.15s ease" }}
                        onMouseEnter={() => setActiveChartPoint(idx)}
                        onMouseLeave={() => setActiveChartPoint(null)}
                      />
                    </g>
                  ))}
                </svg>

                {/* Tooltip on Hover */}
                {activeChartPoint !== null && (
                  <div
                    style={{
                      position: "absolute",
                      left: `${(points[activeChartPoint].x / chartW) * 100}%`,
                      top: `${(points[activeChartPoint].y / chartH) * 100 - 35}%`,
                      transform: "translate(-50%, -100%)",
                      background: "var(--clr-surface-2)",
                      border: "1px solid var(--clr-accent)",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      fontSize: "0.75rem",
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
                      boxShadow: "var(--shadow)",
                      zIndex: 10,
                    }}
                  >
                    <strong>{points[activeChartPoint].day} ({points[activeChartPoint].date})</strong>: {points[activeChartPoint].rate}%
                    <div style={{ fontSize: "0.68rem", color: "var(--clr-text-muted)" }}>
                      {points[activeChartPoint].present} present / {points[activeChartPoint].total} total
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Summary Pill Bar under chart */}
            <div
              style={{
                marginTop: "1rem",
                paddingTop: "0.75rem",
                borderTop: "1px solid var(--clr-border-soft)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.78rem",
              }}
            >
              <span style={{ color: "var(--clr-text-muted)" }}>
                Latest Roll Call: <strong style={{ color: "var(--clr-text)" }}>Sept 29, 2026</strong>
              </span>
              <Link to="/attendance" className="btn btn-ghost btn-sm" style={{ padding: "0 0.25rem", color: "var(--clr-accent-light)" }}>
                Full Attendance Log →
              </Link>
            </div>
          </div>

          {/* RIGHT: Needs Attention (Action-Oriented Workflow) */}
          <div className="card" style={{ display: "flex", flexDirection: "column" }}>
            <div className="card-header" style={{ marginBottom: "0.75rem" }}>
              <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ color: "var(--clr-accent)" }}><Icon.TriangleAlert /></span>
                <span>Needs Attention</span>
              </div>
              <span className="badge badge-warning" style={{ fontSize: "0.68rem" }}>
                Action Items
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", flex: 1 }}>
              {/* Item 1: Prolonged Absence / SARDO */}
              <div className="attention-item">
                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <div className="attention-dot danger" />
                  <div>
                    <div style={{ fontSize: "0.83rem", fontWeight: 600 }}>
                      3 students with prolonged absence
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "var(--clr-text-muted)", marginTop: "2px" }}>
                      Grade 8 – Section Rizal · Last attendance: Sept. 24
                    </div>
                  </div>
                </div>
                <Link to="/attendance" className="btn btn-outline btn-sm" style={{ padding: "2px 8px", fontSize: "0.72rem" }}>
                  View →
                </Link>
              </div>

              {/* Item 2: Pending Enrollments */}
              <div className="attention-item">
                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <div className="attention-dot warning" />
                  <div>
                    <div style={{ fontSize: "0.83rem", fontWeight: 600 }}>
                      2 enrollment applications pending
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "var(--clr-text-muted)", marginTop: "2px" }}>
                      Awaiting document verification · JHS & SHS
                    </div>
                  </div>
                </div>
                <Link to="/enrollments" className="btn btn-outline btn-sm" style={{ padding: "2px 8px", fontSize: "0.72rem" }}>
                  View →
                </Link>
              </div>

              {/* Item 3: Incomplete Grade Sheets */}
              <div className="attention-item">
                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <div className="attention-dot warning" />
                  <div>
                    <div style={{ fontSize: "0.83rem", fontWeight: 600 }}>
                      5 grade sheets incomplete
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "var(--clr-text-muted)", marginTop: "2px" }}>
                      Quarter 1 encoding deadline approaching
                    </div>
                  </div>
                </div>
                <Link to="/grading" className="btn btn-outline btn-sm" style={{ padding: "2px 8px", fontSize: "0.72rem" }}>
                  View →
                </Link>
              </div>

              {/* Item 4: School Forms Due */}
              <div className="attention-item">
                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <div className="attention-dot info" />
                  <div>
                    <div style={{ fontSize: "0.83rem", fontWeight: 600 }}>
                      3 school forms due soon
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "var(--clr-text-muted)", marginTop: "2px" }}>
                      DepEd SF2 (Monthly Attendance) & SF1 Register
                    </div>
                  </div>
                </div>
                <Link to="/school-forms" className="btn btn-outline btn-sm" style={{ padding: "2px 8px", fontSize: "0.72rem" }}>
                  View →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── 5. Lower Grid: Enrollment Distribution & Today's Overview ─────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
          
          {/* LEFT: Enrollment Distribution (JHS vs SHS & Grade Breakdown) */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: "1rem" }}>
              <div>
                <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ color: "var(--clr-accent)" }}><Icon.School /></span>
                  <span>Enrollment Distribution</span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", marginTop: "2px" }}>
                  JHS vs SHS Comparative Level Split · 36 Total Learners
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.75rem" }}>
                <span style={{ color: "#60a5fa", fontWeight: 600 }}>JHS: {summary?.jhsCount ?? 18}</span>
                <span style={{ color: "var(--clr-accent-light)", fontWeight: 600 }}>SHS: {summary?.shsCount ?? 18}</span>
              </div>
            </div>

            {/* Visual Level Bars: JHS & SHS */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "1.25rem" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "4px" }}>
                  <span style={{ fontWeight: 600 }}>Junior High (Grades 7–10)</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#60a5fa" }}>18 learners (50%)</span>
                </div>
                <div style={{ height: "12px", width: "100%", background: "var(--clr-surface-2)", borderRadius: "6px", overflow: "hidden" }}>
                  <div style={{ width: "50%", height: "100%", background: "linear-gradient(90deg, #1e40af, #3b82f6)", borderRadius: "6px" }} />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "4px" }}>
                  <span style={{ fontWeight: 600 }}>Senior High (Grades 11–12)</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--clr-accent-light)" }}>18 learners (50%)</span>
                </div>
                <div style={{ height: "12px", width: "100%", background: "var(--clr-surface-2)", borderRadius: "6px", overflow: "hidden" }}>
                  <div style={{ width: "50%", height: "100%", background: "linear-gradient(90deg, #d97706, #fbbf24)", borderRadius: "6px" }} />
                </div>
              </div>
            </div>

            {/* Gender Demographic Ratio */}
            <div style={{ marginBottom: "1rem", padding: "0.6rem 0.75rem", background: "var(--clr-surface-2)", borderRadius: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "4px" }}>
                <span style={{ color: "#38bdf8", fontWeight: 600 }}>♂ Male: {totalMale} ({malePct}%)</span>
                <span style={{ color: "#f472b6", fontWeight: 600 }}>♀ Female: {totalFemale} ({femalePct}%)</span>
              </div>
              <div style={{ height: "8px", width: "100%", borderRadius: "4px", overflow: "hidden", display: "flex", background: "rgba(0,0,0,0.2)" }}>
                <div style={{ width: `${malePct}%`, background: "#38bdf8", transition: "width 0.4s ease" }} />
                <div style={{ width: `${femalePct}%`, background: "#f472b6", transition: "width 0.4s ease" }} />
              </div>
            </div>

            {/* Grade-by-grade horizontal progress cards */}
            <div style={{ borderTop: "1px solid var(--clr-border-soft)", paddingTop: "1rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--clr-text-muted)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Grade Level Breakdown
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                {gradeLevels.map((gl) => {
                  const pct = Math.round((gl.total / maxGradeCount) * 100);
                  const isSHS = gl.gradeLevel >= 11;
                  return (
                    <div key={gl.gradeLevel} style={{ background: "var(--clr-surface-2)", padding: "0.55rem 0.75rem", borderRadius: "6px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "4px" }}>
                        <span style={{ fontWeight: 600 }}>{gl.label}</span>
                        <span style={{ color: "var(--clr-text-muted)" }}>{gl.total}</span>
                      </div>
                      <div style={{ height: "6px", width: "100%", background: "rgba(0,0,0,0.2)", borderRadius: "3px", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            background: isSHS ? "linear-gradient(90deg, #f59e0b, #fbbf24)" : "linear-gradient(90deg, #1e40af, #3b82f6)",
                            borderRadius: "3px",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Today's Overview & Upcoming Schedule */}
          <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div className="card-header" style={{ marginBottom: "0.75rem" }}>
                <div>
                  <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ color: "#60a5fa" }}><Icon.Calendar /></span>
                    <span>Today's Overview</span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", marginTop: "2px" }}>
                    {todayFormatted}
                  </div>
                </div>
                <span className="badge badge-primary">Active Session</span>
              </div>

              {/* 3 Snapshot Stat Chips */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: "1rem" }}>
                <div style={{ background: "var(--clr-surface-2)", padding: "0.6rem 0.5rem", borderRadius: "6px", textAlign: "center" }}>
                  <div style={{ fontSize: "0.68rem", color: "var(--clr-text-muted)", textTransform: "uppercase" }}>Attendance</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#4ade80", marginTop: "2px" }}>94.6%</div>
                </div>
                <div style={{ background: "var(--clr-surface-2)", padding: "0.6rem 0.5rem", borderRadius: "6px", textAlign: "center" }}>
                  <div style={{ fontSize: "0.68rem", color: "var(--clr-text-muted)", textTransform: "uppercase" }}>Classes</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#93c5fd", marginTop: "2px" }}>9 active</div>
                </div>
                <div style={{ background: "var(--clr-surface-2)", padding: "0.6rem 0.5rem", borderRadius: "6px", textAlign: "center" }}>
                  <div style={{ fontSize: "0.68rem", color: "var(--clr-text-muted)", textTransform: "uppercase" }}>Faculty</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--clr-accent-light)", marginTop: "2px" }}>4 present</div>
                </div>
              </div>

              {/* Upcoming agenda items */}
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--clr-text-muted)", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Upcoming Schedule
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {upcomingEvents.map((evt) => (
                  <div key={evt.title} className="schedule-item">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span className="time-pill">{evt.time}</span>
                      <div>
                        <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>{evt.title}</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--clr-text-muted)" }}>{evt.venue}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer link to full faculty schedule */}
            <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--clr-border-soft)", textAlign: "right" }}>
              <Link to="/schedules/teachers" className="btn btn-ghost btn-sm" style={{ color: "var(--clr-accent-light)", padding: "0" }}>
                Open Faculty Timetable →
              </Link>
            </div>
          </div>
        </div>

        {/* ── 6. Academic Performance & Announcements Section ──────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
          
          {/* Card: Academic Performance Snapshot (DepEd DO 8, s. 2015) */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span className="card-title">Academic Rating Tiers</span>
                <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", marginTop: "2px" }}>
                  DepEd Order No. 8, s. 2015 Performance Classification
                </div>
              </div>
              {perf && totalGraded > 0 && (
                <span className="badge badge-success" style={{ fontSize: "0.7rem" }}>
                  {perf.passingRate}% Passing Rate
                </span>
              )}
            </div>

            {totalGraded > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {[
                  { label: "Outstanding (90–100)",          count: perf?.outstanding ?? 0,        color: "#16a34a" },
                  { label: "Very Satisfactory (85–89)",      count: perf?.verySatisfactory ?? 0,    color: "#3b82f6" },
                  { label: "Satisfactory (80–84)",           count: perf?.satisfactory ?? 0,        color: "#60a5fa" },
                  { label: "Fairly Satisfactory (75–79)",    count: perf?.fairlySatisfactory ?? 0,  color: "#f59e0b" },
                  { label: "Did Not Meet Expectations (<75)", count: perf?.didNotMeet ?? 0,          color: "#dc2626" },
                ].map((tier) => {
                  const pct = Math.round((tier.count / totalGraded) * 100);
                  return (
                    <div key={tier.label} style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                        <span style={{ color: tier.color, fontWeight: 600 }}>{tier.label}</span>
                        <span style={{ color: "var(--clr-text-muted)" }}>
                          <strong>{tier.count}</strong> ({pct}%)
                        </span>
                      </div>
                      <div style={{ height: "6px", width: "100%", background: "var(--clr-surface-2)", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, background: tier.color, height: "100%", borderRadius: "3px" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: "1.25rem 0", textAlign: "center", color: "var(--clr-text-muted)", fontSize: "0.85rem" }}>
                Quarterly ratings being encoded. Access the{" "}
                <Link to="/grading" style={{ color: "var(--clr-accent-light)" }}>Grading & SF9 module</Link>.
              </div>
            )}
          </div>

          {/* Card: Recent Bulletins & Advisories */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span className="card-title">School Advisories</span>
                <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", marginTop: "2px" }}>
                  Announcements & Notices
                </div>
              </div>
              <Link to="/announcements" className="btn btn-outline btn-sm">
                View All →
              </Link>
            </div>

            {announcements.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {announcements.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      padding: "0.65rem 0.85rem",
                      borderRadius: "6px",
                      background: "var(--clr-surface-2)",
                      borderLeft: a.isPinned
                        ? "3px solid var(--clr-primary)"
                        : a.priority === "urgent"
                        ? "3px solid var(--clr-danger)"
                        : a.priority === "advisory"
                        ? "3px solid var(--clr-warning)"
                        : "3px solid var(--clr-border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "2px" }}>
                        {a.isPinned && <span className="badge badge-primary" style={{ fontSize: "0.6rem" }}>Pinned</span>}
                        {a.priority === "urgent" && <span className="badge badge-danger" style={{ fontSize: "0.6rem" }}>Urgent</span>}
                        <span style={{ fontWeight: 600, fontSize: "0.825rem", color: "var(--clr-text)" }}>{a.title}</span>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {a.content}
                      </div>
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--clr-text-muted)", whiteSpace: "nowrap" }}>
                      {new Date(a.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "1.25rem 0", textAlign: "center", color: "var(--clr-text-muted)", fontSize: "0.85rem" }}>
                <span>No bulletins posted yet.</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
