import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import { api } from "@/services/api";
import type { Role, User } from "@/types";
import { ROLE_LABELS } from "@/types";

interface ParsedRow {
  rowNum: number;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  password: string;
  isValid: boolean;
  errors: string[];
}

interface BulkImportModalProps {
  onClose: () => void;
  onSuccess: (newUsers: User[]) => void;
}

export default function BulkImportModal({ onClose, onSuccess }: BulkImportModalProps) {
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [defaultRole, setDefaultRole] = useState<Role>("teacher");
  const [defaultPassword, setDefaultPassword] = useState("DepEd2026!");
  const [skipExisting, setSkipExisting] = useState(true);

  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [importSummary, setImportSummary] = useState<{
    total: number;
    createdCount: number;
    skippedCount: number;
    failedCount: number;
    errors: Array<{ row: number; email: string; reason: string }>;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Download Sample CSV Template ───────────────────────────────────────────
  function handleDownloadTemplate() {
    const csvContent =
      "first_name,last_name,email,role,password\n" +
      "Juan,Dela Cruz,juan.delacruz@deped.gov.ph,teacher,Faculty2026!\n" +
      "Maria,Santos,maria.santos@deped.gov.ph,teacher,Faculty2026!\n" +
      "Antonio,Luna,antonio.luna@deped.gov.ph,registrar,Registrar2026!\n" +
      "Gabriela,Silang,gabriela.silang@deped.gov.ph,teacher,\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "deped_faculty_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ── CSV Parsing Logic ──────────────────────────────────────────────────────
  function parseCSV(text: string): ParsedRow[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return [];

    // Parse header
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[\s_-]/g, ""));
    const idxFirstName = headers.findIndex((h) => h.includes("first") || h === "fname" || h === "givenname");
    const idxLastName = headers.findIndex((h) => h.includes("last") || h === "lname" || h === "surname");
    const idxEmail = headers.findIndex((h) => h.includes("email") || h === "mail");
    const idxRole = headers.findIndex((h) => h.includes("role") || h === "position");
    const idxPass = headers.findIndex((h) => h.includes("pass"));

    const rows: ParsedRow[] = [];
    const emailSeen = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle simple CSV splitting with quote trimming
      const cells = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
      const firstName = idxFirstName !== -1 && cells[idxFirstName] ? cells[idxFirstName] : "";
      const lastName = idxLastName !== -1 && cells[idxLastName] ? cells[idxLastName] : "";
      const email = idxEmail !== -1 && cells[idxEmail] ? cells[idxEmail].toLowerCase() : "";
      
      let rawRole = (idxRole !== -1 && cells[idxRole] ? cells[idxRole].toLowerCase().trim() : "") as Role;
      if (!["super_admin", "registrar", "teacher", "student", "guardian"].includes(rawRole)) {
        rawRole = defaultRole;
      }

      const pass = idxPass !== -1 && cells[idxPass] ? cells[idxPass] : defaultPassword;

      const errors: string[] = [];
      if (!firstName) errors.push("Missing first name");
      if (!lastName) errors.push("Missing last name");
      if (!email) {
        errors.push("Missing email");
      } else if (!email.includes("@") || !email.includes(".")) {
        errors.push("Invalid email format");
      } else if (emailSeen.has(email)) {
        errors.push("Duplicate in file");
      } else {
        emailSeen.add(email);
      }

      if (pass.length < 8) {
        errors.push("Password < 8 chars");
      }

      rows.push({
        rowNum: i + 1,
        firstName,
        lastName,
        email,
        role: rawRole,
        password: pass,
        isValid: errors.length === 0,
        errors,
      });
    }

    return rows;
  }

  function handleFileSelected(selectedFile: File) {
    if (!selectedFile.name.endsWith(".csv")) {
      setError("Please upload a valid CSV (.csv) file.");
      return;
    }
    setError(null);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        setError("The uploaded CSV file is empty or missing headers.");
        return;
      }
      setParsedRows(parsed);
      setStep("preview");
    };
    reader.readAsText(selectedFile);
  }

  function onFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  }

  // ── Execute Batch Import ───────────────────────────────────────────────────
  async function handleExecuteImport() {
    const validUsers = parsedRows
      .filter((r) => r.isValid)
      .map((r) => ({
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email,
        role: r.role,
        password: r.password,
      }));

    if (validUsers.length === 0) {
      setError("There are no valid records ready for import. Please review errors.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resp = await api.users.bulkImport({
        users: validUsers,
        skipExisting,
      });

      setImportSummary({
        total: resp.total,
        createdCount: resp.createdCount,
        skippedCount: resp.skippedCount,
        failedCount: resp.failedCount,
        errors: resp.errors || [],
      });

      if (resp.users && resp.users.length > 0) {
        onSuccess(resp.users);
      }

      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute bulk import");
    } finally {
      setLoading(false);
    }
  }

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: "800px", width: "95%" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
              Bulk Faculty & Staff CSV Import
            </h2>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "var(--clr-text-muted)" }}>
              Upload and register multiple teachers or staff members in seconds.
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert alert-error mb-4">{error}</div>}

        {/* ── STEP 1: UPLOAD & CONFIGURATION ── */}
        {step === "upload" && (
          <div>
            {/* Template Banner */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.85rem 1rem",
                borderRadius: "var(--radius)",
                background: "rgba(59, 130, 246, 0.08)",
                border: "1px solid rgba(59, 130, 246, 0.2)",
                marginBottom: "1.25rem",
              }}
            >
              <div>
                <strong style={{ fontSize: "0.85rem", color: "#3b82f6" }}>Need the standard CSV format?</strong>
                <div style={{ fontSize: "0.78rem", color: "var(--clr-text-muted)" }}>
                  Columns: <code>first_name, last_name, email, role, password</code>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                style={{ borderColor: "#3b82f6", color: "#3b82f6" }}
                onClick={handleDownloadTemplate}
              >
                📥 Download Template
              </button>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragActive ? "var(--clr-primary)" : "var(--clr-border)"}`,
                borderRadius: "var(--radius)",
                padding: "2.5rem 1.5rem",
                textAlign: "center",
                cursor: "pointer",
                background: dragActive ? "rgba(79, 70, 229, 0.05)" : "var(--clr-surface-2)",
                transition: "all 0.15s ease",
                marginBottom: "1.25rem",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                style={{ display: "none" }}
                onChange={onFileInputChange}
              />
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📄</div>
              <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.25rem" }}>
                Click to browse or drag and drop your CSV file here
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)" }}>
                Supported format: UTF-8 Encoded .CSV files up to 500 rows
              </div>
            </div>

            {/* Default Import Preferences */}
            <div
              style={{
                background: "var(--clr-surface-2)",
                padding: "1rem",
                borderRadius: "var(--radius)",
                marginBottom: "1rem",
              }}
            >
              <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.85rem", fontWeight: 600 }}>
                Default Import Settings (applied if column is blank)
              </h4>
              <div className="grid-2" style={{ gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Default Role for Blank Cells</label>
                  <select
                    className="form-select"
                    value={defaultRole}
                    onChange={(e) => setDefaultRole(e.target.value as Role)}
                  >
                    <option value="teacher">Teacher</option>
                    <option value="registrar">Registrar</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Default Initial Password</label>
                  <input
                    className="form-input"
                    value={defaultPassword}
                    onChange={(e) => setDefaultPassword(e.target.value)}
                    placeholder="DepEd2026!"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 mt-2" style={{ cursor: "pointer", fontSize: "0.82rem" }}>
                <input
                  type="checkbox"
                  checked={skipExisting}
                  onChange={(e) => setSkipExisting(e.target.checked)}
                />
                <span>Skip existing emails without failing the import</span>
              </label>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: PARSE, VALIDATE & PREVIEW ── */}
        {step === "preview" && (
          <div>
            {file && (
              <div style={{ fontSize: "0.82rem", color: "var(--clr-text-muted)", marginBottom: "0.75rem" }}>
                📄 Uploaded File: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
            {/* Stat Counters */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              <div style={{ background: "var(--clr-surface-2)", padding: "0.75rem", borderRadius: "var(--radius)", textAlign: "center" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--clr-text-muted)", textTransform: "uppercase" }}>Total Records</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>{parsedRows.length}</div>
              </div>
              <div style={{ background: "rgba(16, 185, 129, 0.08)", padding: "0.75rem", borderRadius: "var(--radius)", textAlign: "center" }}>
                <div style={{ fontSize: "0.72rem", color: "#10b981", textTransform: "uppercase" }}>Valid & Ready</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#10b981" }}>{validCount}</div>
              </div>
              <div style={{ background: "rgba(239, 68, 68, 0.08)", padding: "0.75rem", borderRadius: "var(--radius)", textAlign: "center" }}>
                <div style={{ fontSize: "0.72rem", color: "#ef4444", textTransform: "uppercase" }}>Needs Attention</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#ef4444" }}>{invalidCount}</div>
              </div>
            </div>

            {/* Preview Table */}
            <div style={{ maxHeight: "320px", overflowY: "auto", border: "1px solid var(--clr-border)", borderRadius: "var(--radius)", marginBottom: "1rem" }}>
              <table className="data-table" style={{ width: "100%", fontSize: "0.78rem" }}>
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}>#</th>
                    <th>Full Name</th>
                    <th>Email Address</th>
                    <th>Role</th>
                    <th>Password</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row) => (
                    <tr key={row.rowNum} style={{ background: row.isValid ? undefined : "rgba(239, 68, 68, 0.04)" }}>
                      <td>{row.rowNum}</td>
                      <td>
                        <strong style={{ color: row.firstName && row.lastName ? undefined : "var(--clr-danger)" }}>
                          {row.lastName ? `${row.lastName}, ` : ""}{row.firstName || "(Missing Name)"}
                        </strong>
                      </td>
                      <td style={{ fontFamily: "monospace" }}>{row.email || "(Missing Email)"}</td>
                      <td>
                        <span className="badge badge-primary">{ROLE_LABELS[row.role] || row.role}</span>
                      </td>
                      <td style={{ color: "var(--clr-text-muted)" }}>
                        {row.password ? "••••••••" : "(Default)"}
                      </td>
                      <td>
                        {row.isValid ? (
                          <span className="badge badge-success">✓ Ready</span>
                        ) : (
                          <span className="badge badge-danger" title={row.errors.join(", ")}>
                            ⚠ {row.errors[0]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invalidCount > 0 && (
              <p style={{ fontSize: "0.78rem", color: "var(--clr-warning)", margin: "0 0 1rem 0" }}>
                Note: Invalid rows with missing required fields will be automatically skipped during import.
              </p>
            )}

            <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between" }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => { setFile(null); setStep("upload"); }}
                disabled={loading}
              >
                ← Back to Upload
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExecuteImport}
                disabled={loading || validCount === 0}
              >
                {loading ? "Importing Accounts…" : `Import ${validCount} Accounts →`}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: RESULT SUMMARY ── */}
        {step === "result" && importSummary && (
          <div>
            <div
              style={{
                textAlign: "center",
                padding: "1.5rem",
                borderRadius: "var(--radius)",
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                marginBottom: "1.25rem",
              }}
            >
              <div style={{ fontSize: "2.5rem", marginBottom: "0.25rem" }}>🎉</div>
              <h3 style={{ margin: "0 0 0.5rem 0", color: "#10b981", fontSize: "1.2rem" }}>
                Import Completed Successfully!
              </h3>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--clr-text-muted)" }}>
                {importSummary.createdCount} user account(s) have been provisioned and added to the school system.
              </p>
            </div>

            {/* Summary Counters */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "0.75rem",
                marginBottom: "1.25rem",
              }}
            >
              <div style={{ background: "var(--clr-surface-2)", padding: "0.75rem", borderRadius: "var(--radius)", textAlign: "center" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--clr-text-muted)" }}>Created</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#10b981" }}>{importSummary.createdCount}</div>
              </div>
              <div style={{ background: "var(--clr-surface-2)", padding: "0.75rem", borderRadius: "var(--radius)", textAlign: "center" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--clr-text-muted)" }}>Skipped (Existing)</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--clr-warning)" }}>{importSummary.skippedCount}</div>
              </div>
              <div style={{ background: "var(--clr-surface-2)", padding: "0.75rem", borderRadius: "var(--radius)", textAlign: "center" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--clr-text-muted)" }}>Failed</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: importSummary.failedCount > 0 ? "var(--clr-danger)" : "var(--clr-text-muted)" }}>
                  {importSummary.failedCount}
                </div>
              </div>
            </div>

            {/* Error List if any */}
            {importSummary.errors.length > 0 && (
              <div style={{ marginBottom: "1.25rem" }}>
                <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.85rem", color: "var(--clr-danger)" }}>
                  Errors & Warnings ({importSummary.errors.length})
                </h4>
                <div style={{ maxHeight: "150px", overflowY: "auto", background: "var(--clr-surface-2)", padding: "0.5rem", borderRadius: "var(--radius)", fontSize: "0.75rem" }}>
                  {importSummary.errors.map((err, i) => (
                    <div key={i} style={{ padding: "0.25rem 0", borderBottom: "1px solid var(--clr-border)" }}>
                      <strong>Row {err.row}:</strong> {err.email ? `(${err.email}) ` : ""}{err.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
