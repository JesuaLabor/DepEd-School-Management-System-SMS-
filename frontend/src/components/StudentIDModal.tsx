import { useState, useEffect } from "react";
import QRCode from "qrcode";
import type { Student } from "@/types";
import { STRAND_LABELS } from "@/types";

interface StudentIDModalProps {
  student: Student;
  onClose: () => void;
}

export default function StudentIDModal({ student: s, onClose }: StudentIDModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [viewMode, setViewMode] = useState<"both" | "front" | "back">("both");

  const fullName = `${s.firstName} ${s.middleName ? s.middleName[0] + ". " : ""}${s.lastName}${s.extName ? " " + s.extName : ""}`.toUpperCase();
  const isSHS = s.gradeLevel >= 11;
  const gradeStr = isSHS && s.strand
    ? `GRADE ${s.gradeLevel} · ${STRAND_LABELS[s.strand] || s.strand}`
    : `GRADE ${s.gradeLevel}`;

  // Generate QR Code data URL
  useEffect(() => {
    const payload = JSON.stringify({
      lrn: s.lrn,
      name: `${s.lastName}, ${s.firstName}`,
      schoolId: "304036",
      school: "Kalilangan National High School",
      grade: s.gradeLevel,
      emergency: s.guardian?.contactNo || s.contactNo || "N/A",
    });

    QRCode.toDataURL(
      payload,
      {
        width: 140,
        margin: 1,
        color: {
          dark: "#0c1427",
          light: "#ffffff",
        },
      },
      (err, url) => {
        if (!err && url) {
          setQrCodeUrl(url);
        }
      }
    );
  }, [s]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #student-id-print-area, #student-id-print-area * {
            visibility: visible;
          }
          #student-id-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: flex !important;
            flex-direction: row !important;
            justify-content: center !important;
            gap: 20px !important;
            padding: 20px 0 !important;
            background: #ffffff !important;
          }
          .id-card-no-print {
            display: none !important;
          }
          .id-card-container {
            box-shadow: none !important;
            border: 1px solid #1a2744 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Modal Backdrop */}
      <div
        className="id-card-no-print"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 16, 30, 0.75)",
          backdropFilter: "blur(4px)",
          zIndex: 9998,
        }}
      />

      {/* Modal Dialog */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "900px",
          maxWidth: "96vw",
          maxHeight: "92vh",
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div
          className="id-card-no-print"
          style={{
            padding: "1.1rem 1.5rem",
            background: "#0c1322",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.3rem" }}>🪪</span>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#f8fafc" }}>
                Official DepEd Student Identification Card
              </h2>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "#8fa3bf" }}>
                Kalilangan National High School · School ID: 304036 · LIS Generated
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                display: "flex",
                background: "#17233d",
                padding: "2px",
                borderRadius: "6px",
                border: "1px solid #2a3b5c",
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode("both")}
                style={{
                  background: viewMode === "both" ? "#2563eb" : "transparent",
                  color: "#ffffff",
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: "4px",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Both Sides
              </button>
              <button
                type="button"
                onClick={() => setViewMode("front")}
                style={{
                  background: viewMode === "front" ? "#2563eb" : "transparent",
                  color: "#ffffff",
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: "4px",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Front
              </button>
              <button
                type="button"
                onClick={() => setViewMode("back")}
                style={{
                  background: viewMode === "back" ? "#2563eb" : "transparent",
                  color: "#ffffff",
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: "4px",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Back
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "0.45rem 1rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(37, 99, 235, 0.4)",
              }}
            >
              <span>🖨️</span>
              <span>Print ID Card</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                color: "#94a3b8",
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.9rem",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body / ID Card Canvas */}
        <div
          style={{
            padding: "2rem",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "#131d33",
          }}
        >
          <div
            id="student-id-print-area"
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "2rem",
              width: "100%",
            }}
          >
            {/* ── CARD FRONT (Standard CR80 3.375" x 2.125" ratio, styled at 330px x 510px portrait) ── */}
            {(viewMode === "both" || viewMode === "front") && (
              <div
                className="id-card-container"
                style={{
                  width: "330px",
                  height: "510px",
                  background: "#ffffff",
                  borderRadius: "14px",
                  boxShadow: "0 15px 35px rgba(0, 0, 0, 0.4)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  border: "1px solid #e2e8f0",
                }}
              >
                {/* Header banner */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #0c1427 0%, #1a2c54 100%)",
                    padding: "0.85rem 0.75rem 0.6rem",
                    textAlign: "center",
                    color: "#ffffff",
                    position: "relative",
                    borderBottom: "4px solid #f59e0b",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem" }}>
                    <img
                      src="/knhs_logo.png"
                      alt="KNHS"
                      style={{
                        width: "44px",
                        height: "44px",
                        objectFit: "contain",
                        background: "#ffffff",
                        borderRadius: "50%",
                        padding: "2px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                      }}
                    />
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: "0.55rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#93c5fd", fontWeight: 700 }}>
                        Republic of the Philippines · DepEd
                      </div>
                      <div style={{ fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.03em", color: "#ffffff", lineHeight: 1.15 }}>
                        KALILANGAN NAT’L HIGH SCHOOL
                      </div>
                      <div style={{ fontSize: "0.58rem", color: "#e2e8f0" }}>
                        School ID: <strong>304036</strong> · Division of Bukidnon
                      </div>
                    </div>
                  </div>
                </div>

                {/* Body Content */}
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "1rem 1.25rem 0.75rem",
                    textAlign: "center",
                    background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
                  }}
                >
                  {/* Photo Frame */}
                  <div
                    style={{
                      width: "115px",
                      height: "125px",
                      borderRadius: "10px",
                      border: "3px solid #0c1427",
                      background: s.sex === "Female" ? "linear-gradient(135deg, #ec4899 0%, #be185d 100%)" : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                      color: "#ffffff",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
                      marginBottom: "0.75rem",
                      position: "relative",
                    }}
                  >
                    <span style={{ fontSize: "2.5rem", fontWeight: 800, letterSpacing: "0.05em" }}>
                      {s.firstName[0]}{s.lastName[0]}
                    </span>
                    <span style={{ fontSize: "0.6rem", opacity: 0.85, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {s.sex}
                    </span>
                  </div>

                  {/* Student Full Name */}
                  <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0c1427", letterSpacing: "-0.01em", lineHeight: 1.25 }}>
                    {fullName}
                  </div>

                  {/* LRN Badge */}
                  <div
                    style={{
                      marginTop: "0.4rem",
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      padding: "3px 12px",
                      borderRadius: "6px",
                      fontFamily: "monospace",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      color: "#1d4ed8",
                      letterSpacing: "0.06em",
                    }}
                  >
                    LRN: {s.lrn}
                  </div>

                  {/* Grade & Strand */}
                  <div style={{ marginTop: "0.5rem", fontSize: "0.78rem", fontWeight: 700, color: "#334155" }}>
                    {gradeStr}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "1px" }}>
                    School Year: <strong>{s.schoolYear || "2024–2025"}</strong>
                  </div>

                  {/* Student Signature line */}
                  <div style={{ marginTop: "auto", width: "100%", paddingTop: "0.6rem" }}>
                    <div style={{ width: "70%", height: "1px", background: "#94a3b8", margin: "0 auto" }} />
                    <div style={{ fontSize: "0.58rem", color: "#64748b", marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Learner's Signature
                    </div>
                  </div>
                </div>

                {/* Footer Band */}
                <div
                  style={{
                    background: "#0c1427",
                    color: "#f59e0b",
                    padding: "0.4rem 0.5rem",
                    textAlign: "center",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  DepEd Learner Information System (LIS)
                </div>
              </div>
            )}

            {/* ── CARD BACK ──────────────────────────────────────────────────────── */}
            {(viewMode === "both" || viewMode === "back") && (
              <div
                className="id-card-container"
                style={{
                  width: "330px",
                  height: "510px",
                  background: "#ffffff",
                  borderRadius: "14px",
                  boxShadow: "0 15px 35px rgba(0, 0, 0, 0.4)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  border: "1px solid #e2e8f0",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    background: "#0c1427",
                    padding: "0.65rem 0.75rem",
                    textAlign: "center",
                    color: "#ffffff",
                    borderBottom: "3px solid #f59e0b",
                  }}
                >
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Emergency & Institutional Record
                  </div>
                </div>

                {/* Back Body */}
                <div
                  style={{
                    flex: 1,
                    padding: "0.9rem 1.15rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    background: "#ffffff",
                  }}
                >
                  {/* QR Code Container */}
                  <div
                    style={{
                      padding: "6px",
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                      marginBottom: "0.6rem",
                    }}
                  >
                    {qrCodeUrl ? (
                      <img src={qrCodeUrl} alt="Student QR Code" style={{ width: "115px", height: "115px", display: "block" }} />
                    ) : (
                      <div style={{ width: "115px", height: "115px", background: "#f1f5f9" }} />
                    )}
                  </div>
                  <div style={{ fontSize: "0.6rem", color: "#64748b", fontFamily: "monospace", letterSpacing: "0.04em", marginBottom: "0.75rem" }}>
                    SCAN TO VERIFY LEARNER IDENTITY
                  </div>

                  {/* Emergency Details Box */}
                  <div
                    style={{
                      width: "100%",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "0.5rem 0.65rem",
                      textAlign: "left",
                      fontSize: "0.68rem",
                      marginBottom: "0.6rem",
                      lineHeight: 1.4,
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "#ef4444", textTransform: "uppercase", fontSize: "0.62rem", marginBottom: "3px" }}>
                      In Case of Emergency
                    </div>
                    <div>
                      <strong style={{ color: "#0c1427" }}>Contact:</strong>{" "}
                      <span style={{ color: "#334155" }}>
                        {s.guardian?.name || "Parent/Guardian"} ({s.guardian?.relationship || "Guardian"})
                      </span>
                    </div>
                    <div>
                      <strong style={{ color: "#0c1427" }}>Phone:</strong>{" "}
                      <span style={{ color: "#334155" }}>{s.guardian?.contactNo || s.contactNo || "N/A"}</span>
                    </div>
                    <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <strong style={{ color: "#0c1427" }}>Barangay:</strong>{" "}
                      <span style={{ color: "#334155" }}>{s.address?.barangay || "Kalilangan, Bukidnon"}</span>
                    </div>
                  </div>

                  {/* Certification statement */}
                  <p style={{ margin: "0 0 0.75rem", fontSize: "0.58rem", color: "#64748b", lineHeight: 1.35, textAlign: "justify" }}>
                    This certifies that the person whose name and picture appear on this card is a bonafide student of Kalilangan National High School. Please return if found to the Office of the Registrar.
                  </p>

                  {/* Principal Signature */}
                  <div style={{ marginTop: "auto", width: "100%", textAlign: "center" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#0c1427", letterSpacing: "0.02em" }}>
                      MA. ELENA V. ALMINE
                    </div>
                    <div style={{ width: "65%", height: "1px", background: "#0c1427", margin: "1px auto 2px" }} />
                    <div style={{ fontSize: "0.58rem", color: "#64748b", textTransform: "uppercase" }}>
                      Secondary School Principal IV
                    </div>
                  </div>
                </div>

                {/* Footer Band */}
                <div
                  style={{
                    background: "#0c1427",
                    color: "#94a3b8",
                    padding: "0.35rem 0.5rem",
                    textAlign: "center",
                    fontSize: "0.55rem",
                  }}
                >
                  Valid for School Year {s.schoolYear || "2024–2025"} · Non-Transferable
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className="id-card-no-print"
          style={{
            padding: "0.85rem 1.5rem",
            background: "#0c1322",
            borderTop: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
            💡 Tip: Click <strong>Print ID Card</strong> to print on standard A4 or PVC card stock.
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              color: "#f1f5f9",
              borderRadius: "8px",
              padding: "0.45rem 1.1rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
