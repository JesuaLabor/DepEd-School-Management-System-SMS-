import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import type { Student } from "@/types";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PaletteAction {
  id: string;
  title: string;
  category: "Navigation" | "Action";
  icon: string;
  path: string;
  shortcut?: string;
}

const STATIC_ACTIONS: PaletteAction[] = [
  // Navigation
  { id: "nav-dash", title: "Executive Dashboard", category: "Navigation", icon: "📊", path: "/" },
  { id: "nav-students", title: "Learner Directory (LIS)", category: "Navigation", icon: "🎓", path: "/students" },
  { id: "nav-sections", title: "Class Sections & Advisories", category: "Navigation", icon: "🏫", path: "/sections" },
  { id: "nav-attendance", title: "Attendance Tracking & Roll Call", category: "Navigation", icon: "📅", path: "/attendance" },
  { id: "nav-grading", title: "DO 8 Grading Sheet & Scores", category: "Navigation", icon: "📝", path: "/grading" },
  { id: "nav-sf9", title: "SF9 Learner Progress Report Card", category: "Navigation", icon: "📄", path: "/sf9" },
  { id: "nav-forms", title: "DepEd School Forms Hub", category: "Navigation", icon: "📑", path: "/school-forms" },
  { id: "nav-enroll", title: "Enrollments & Intake", category: "Navigation", icon: "📋", path: "/enrollments" },
  { id: "nav-users", title: "User Management", category: "Navigation", icon: "👥", path: "/users" },
  { id: "nav-messages", title: "Direct Messages & Inbox", category: "Navigation", icon: "💬", path: "/messages" },
  { id: "nav-announcements", title: "School Bulletins & Notices", category: "Navigation", icon: "📢", path: "/announcements" },
  { id: "nav-profile", title: "My Profile & Security Settings", category: "Navigation", icon: "⚙️", path: "/profile" },

  // Actions
  { id: "act-attendance", title: "Record Daily Roll Call", category: "Action", icon: "⚡", path: "/attendance", shortcut: "R" },
  { id: "act-enroll", title: "Process New Student Enrollment", category: "Action", icon: "➕", path: "/enrollments", shortcut: "E" },
  { id: "act-sf2", title: "Generate Monthly SF2 Attendance Report", category: "Action", icon: "📊", path: "/school-forms", shortcut: "S" },
  { id: "act-announcement", title: "Post Urgent School Advisory", category: "Action", icon: "🚨", path: "/announcements" },
  { id: "act-users", title: "Create New Faculty / Staff Account", category: "Action", icon: "👤", path: "/users" },
];

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setStudents([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced student search
  useEffect(() => {
    if (!isOpen || query.trim().length < 2) {
      setStudents([]);
      setSearchingStudents(false);
      return;
    }

    setSearchingStudents(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.students.list({ search: query.trim() });
        setStudents(res.data.slice(0, 5));
      } catch {
        setStudents([]);
      } finally {
        setSearchingStudents(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Filter actions
  const filteredActions = STATIC_ACTIONS.filter(a =>
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  // Total selectable items
  const totalItems = filteredActions.length + students.length;

  const handleSelect = (index: number) => {
    if (index < filteredActions.length) {
      const action = filteredActions[index];
      navigate(action.path);
      onClose();
    } else {
      const studentIndex = index - filteredActions.length;
      const student = students[studentIndex];
      if (student) {
        navigate(`/students`);
        onClose();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (totalItems || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + totalItems) % (totalItems || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(selectedIndex);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08)",
          overflow: "hidden",
          animation: "slide-up 0.15s ease",
        }}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0.85rem 1.25rem",
            borderBottom: "1px solid #e2e8f0",
            gap: "0.75rem",
          }}
        >
          <span style={{ fontSize: "1.1rem", color: "#64748b" }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, page name, or student LRN..."
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: "1rem",
              color: "#0f172a",
              fontWeight: 500,
              background: "transparent",
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                fontSize: "0.85rem",
                padding: "2px 6px",
              }}
            >
              ✕
            </button>
          )}
          <span
            style={{
              fontSize: "0.68rem",
              background: "#f1f5f9",
              color: "#64748b",
              padding: "2px 6px",
              borderRadius: "4px",
              fontFamily: "monospace",
              border: "1px solid #e2e8f0",
            }}
          >
            ESC to close
          </span>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: "380px", overflowY: "auto", padding: "0.5rem" }}>
          {/* Matching Students */}
          {students.length > 0 && (
            <div style={{ marginBottom: "0.5rem" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", padding: "0.4rem 0.75rem", letterSpacing: "0.05em" }}>
                Matching Learners (LIS)
              </div>
              {students.map((student, idx) => {
                const itemIndex = filteredActions.length + idx;
                const isSelected = selectedIndex === itemIndex;
                return (
                  <div
                    key={student.id}
                    onClick={() => handleSelect(itemIndex)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "8px",
                      background: isSelected ? "#eff6ff" : "transparent",
                      cursor: "pointer",
                      transition: "background 0.1s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                      <span style={{ fontSize: "1rem" }}>👤</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem", color: isSelected ? "#2563eb" : "#0f172a" }}>
                          {student.lastName}, {student.firstName}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                          LRN: <span style={{ fontFamily: "monospace" }}>{student.lrn}</span> · Grade {student.gradeLevel}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "#2563eb", fontWeight: 600 }}>Jump to profile →</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Actions & Navigation */}
          {filteredActions.length > 0 && (
            <div>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", padding: "0.4rem 0.75rem", letterSpacing: "0.05em" }}>
                {query ? "Matching Commands & Pages" : "Quick Actions & Navigation"}
              </div>
              {filteredActions.map((action, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <div
                    key={action.id}
                    onClick={() => handleSelect(idx)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "8px",
                      background: isSelected ? "#eff6ff" : "transparent",
                      cursor: "pointer",
                      transition: "background 0.1s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                      <span style={{ fontSize: "1.1rem" }}>{action.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem", color: isSelected ? "#2563eb" : "#0f172a" }}>
                          {action.title}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                          {action.category}
                        </div>
                      </div>
                    </div>
                    {action.shortcut ? (
                      <span
                        style={{
                          fontSize: "0.68rem",
                          background: isSelected ? "#dbeafe" : "#f1f5f9",
                          color: isSelected ? "#1d4ed8" : "#64748b",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontFamily: "monospace",
                        }}
                      >
                        {action.shortcut}
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>↵</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty Search Result */}
          {totalItems === 0 && !searchingStudents && (
            <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#64748b" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.35rem" }}>🔍</div>
              <div style={{ fontWeight: 600, color: "#0f172a" }}>No results found for "{query}"</div>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "2px" }}>
                Search by student name, 12-digit LRN, or command name.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "0.55rem 1.25rem",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.72rem",
            color: "#64748b",
          }}
        >
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
          </div>
          <span>Kalilangan National High School SMS</span>
        </div>
      </div>
    </div>
  );
}
