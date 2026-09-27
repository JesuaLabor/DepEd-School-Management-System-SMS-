import { Link, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <header style={{ display: "flex", gap: "1rem", padding: "1rem", borderBottom: "1px solid #ddd" }}>
        <strong>DepEd SMS</strong>
        <nav style={{ display: "flex", gap: "0.75rem" }}>
          <Link to="/">Dashboard</Link>
          <Link to="/students">Students</Link>
        </nav>
      </header>
      <main style={{ padding: "1.5rem" }}>
        <Outlet />
      </main>
    </div>
  );
}
