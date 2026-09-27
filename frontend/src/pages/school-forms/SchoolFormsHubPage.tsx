import { useState } from "react";
import { Link } from "react-router-dom";
import SF2Viewer from "./SF2Viewer";
import SF10Viewer from "./SF10Viewer";

type FormTab = "sf2" | "sf10";

export default function SchoolFormsHubPage() {
  const [activeTab, setActiveTab] = useState<FormTab>("sf2");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Page Header ── */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--clr-text-muted)", marginBottom: "0.25rem" }}>
            <span>DepEd Compliance</span>
            <span>/</span>
            <span style={{ color: "var(--clr-text)" }}>Standard School Forms</span>
          </div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, color: "var(--clr-text)" }}>
            DepEd School Forms Hub
          </h1>
          <p style={{ margin: "0.25rem 0 0 0", color: "var(--clr-text-muted)", fontSize: "0.9rem" }}>
            Official Department of Education standard school forms pursuant to DepEd Order No. 58, s. 2017.
          </p>
        </div>
      </div>

      {/* ── Quick Launcher Grid for All Forms ── */}
      <div className="no-print" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        {/* SF1 Link */}
        <Link to="/sections" className="card" style={{ padding: "1.25rem", textDecoration: "none", color: "inherit", transition: "all var(--transition)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span className="badge badge-info" style={{ fontWeight: 700 }}>SF1</span>
            <span style={{ fontSize: "1.2rem" }}>📋</span>
          </div>
          <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "1rem", fontWeight: 700, color: "var(--clr-text)" }}>School Register</h4>
          <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--clr-text-muted)", lineHeight: 1.4 }}>
            Official class masterlist of enrolled learners by gender with LRN and guardian info.
          </p>
        </Link>

        {/* SF2 Tab */}
        <div
          onClick={() => setActiveTab("sf2")}
          className="card"
          style={{
            padding: "1.25rem",
            cursor: "pointer",
            border: activeTab === "sf2" ? "2px solid var(--clr-primary)" : "1px solid var(--clr-border)",
            background: activeTab === "sf2" ? "rgba(37, 99, 235, 0.08)" : "var(--clr-surface)",
            transition: "all var(--transition)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span className="badge badge-success" style={{ fontWeight: 700 }}>SF2</span>
            <span style={{ fontSize: "1.2rem" }}>📅</span>
          </div>
          <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "1rem", fontWeight: 700, color: "var(--clr-text)" }}>Daily Attendance</h4>
          <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--clr-text-muted)", lineHeight: 1.4 }}>
            Monthly attendance report with Daily Average Attendance (ADA) and SARDO counters.
          </p>
        </div>

        {/* SF9 Link */}
        <Link to="/sf9" className="card" style={{ padding: "1.25rem", textDecoration: "none", color: "inherit", transition: "all var(--transition)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span className="badge badge-warning" style={{ fontWeight: 700 }}>SF9</span>
            <span style={{ fontSize: "1.2rem" }}>📄</span>
          </div>
          <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "1rem", fontWeight: 700, color: "var(--clr-text)" }}>Progress Report Card</h4>
          <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--clr-text-muted)", lineHeight: 1.4 }}>
            Learner quarterly academic ratings, general average, descriptors, and observed values.
          </p>
        </Link>

        {/* SF10 Tab */}
        <div
          onClick={() => setActiveTab("sf10")}
          className="card"
          style={{
            padding: "1.25rem",
            cursor: "pointer",
            border: activeTab === "sf10" ? "2px solid var(--clr-primary)" : "1px solid var(--clr-border)",
            background: activeTab === "sf10" ? "rgba(37, 99, 235, 0.08)" : "var(--clr-surface)",
            transition: "all var(--transition)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span className="badge badge-default" style={{ fontWeight: 700 }}>SF10</span>
            <span style={{ fontSize: "1.2rem" }}>🎓</span>
          </div>
          <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "1rem", fontWeight: 700, color: "var(--clr-text)" }}>Permanent Record</h4>
          <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--clr-text-muted)", lineHeight: 1.4 }}>
            Learner's complete permanent academic transcript across all grade levels (Form 137).
          </p>
        </div>
      </div>

      {/* ── Active Form Viewer ── */}
      <div>
        {activeTab === "sf2" && <SF2Viewer />}
        {activeTab === "sf10" && <SF10Viewer />}
      </div>
    </div>
  );
}
