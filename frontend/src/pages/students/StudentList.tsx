import { useEffect, useState } from "react";
import type { Student } from "@/types";
import { api } from "@/services/api";

export default function StudentList() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.students
      .list()
      .then(setStudents)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load students"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading students...</p>;
  if (error) return <p style={{ color: "crimson" }}>{error}</p>;

  return (
    <div>
      <h2>Students</h2>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={cellStyle}>LRN</th>
            <th style={cellStyle}>Name</th>
            <th style={cellStyle}>Grade</th>
            <th style={cellStyle}>Strand</th>
            <th style={cellStyle}>Status</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td style={cellStyle}>{s.lrn}</td>
              <td style={cellStyle}>
                {s.lastName}, {s.firstName}
              </td>
              <td style={cellStyle}>{s.gradeLevel}</td>
              <td style={cellStyle}>{s.strand || "—"}</td>
              <td style={cellStyle}>{s.status}</td>
            </tr>
          ))}
          {students.length === 0 && (
            <tr>
              <td style={cellStyle} colSpan={5}>
                No students yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const cellStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  padding: "0.5rem",
  textAlign: "left",
};
