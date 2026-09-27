import type { Student } from "@/types";
import { STRAND_LABELS, STATUS_LABELS } from "@/types";

interface Props {
  student:  Student;
  onClose:  () => void;
  onEdit:   () => void;
  onStatus: (status: string) => void;
}

function InfoItem({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="info-item">
      <div className="info-label">{label}</div>
      <div className="info-value">{value ?? <span style={{ color: "var(--clr-text-faint)" }}>—</span>}</div>
    </div>
  );
}

function statusBadge(status: Student["status"]) {
  const cls = { enrolled: "badge-success", dropped: "badge-danger", transferred: "badge-warning", graduated: "badge-primary" }[status];
  return <span className={`badge ${cls}`}>{STATUS_LABELS[status]}</span>;
}

export default function StudentDrawer({ student: s, onClose, onEdit, onStatus }: Props) {
  const initials = `${s.firstName[0]}${s.lastName[0]}`.toUpperCase();
  const isSHS    = s.gradeLevel >= 11;
  const fullName = [s.lastName, s.firstName, s.middleName].filter(Boolean).join(", ");
  const age      = Math.floor((Date.now() - new Date(s.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000));

  const nextStatuses = {
    enrolled:    ["dropped","transferred","graduated"],
    dropped:     ["enrolled"],
    transferred: ["enrolled"],
    graduated:   [],
  }[s.status];

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <h2>Student Profile</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-body">
          {/* Hero */}
          <div className="student-hero">
            <div className={`student-avatar-lg ${s.sex === "Female" ? "female" : "male"}`}>{initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>{fullName}{s.extName ? ` ${s.extName}` : ""}</div>
              <div className="info-label" style={{ marginTop: 3 }}>LRN: <span className="info-value mono">{s.lrn}</span></div>
              <div style={{ marginTop: 6, display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
                {statusBadge(s.status)}
                <span className="badge badge-neutral">Grade {s.gradeLevel}</span>
                {isSHS && s.strand && <span className="badge badge-indigo">{STRAND_LABELS[s.strand]}</span>}
                <span className="badge badge-neutral">{s.schoolYear}</span>
              </div>
            </div>
          </div>

          {/* Personal */}
          <div className="info-section">
            <div className="info-section-title">Personal Information</div>
            <div className="info-grid">
              <InfoItem label="Date of Birth"  value={new Date(s.birthDate).toLocaleDateString("en-PH", { year:"numeric", month:"long", day:"numeric" })} />
              <InfoItem label="Age"            value={`${age} years old`} />
              <InfoItem label="Sex"            value={s.sex} />
              <InfoItem label="Civil Status"   value={s.civilStatus} />
              <InfoItem label="Religion"       value={s.religion} />
              <InfoItem label="Mother Tongue"  value={s.motherTongue} />
              <InfoItem label="Nationality"    value={s.nationality} />
              <InfoItem label="Birth Place"    value={s.birthPlace} />
              <InfoItem label="Contact No."    value={s.contactNo} />
              <InfoItem label="Email"          value={s.email} />
            </div>
          </div>

          {/* Address */}
          <div className="info-section">
            <div className="info-section-title">Address</div>
            <div className="info-value" style={{ lineHeight: 1.7 }}>
              {[s.address?.houseNo, s.address?.street, s.address?.barangay, s.address?.city, s.address?.province, s.address?.region]
                .filter(Boolean).join(", ") || "—"}
              {s.address?.postalCode && <span className="text-muted"> ({s.address.postalCode})</span>}
            </div>
          </div>

          {/* Academic */}
          <div className="info-section">
            <div className="info-section-title">Academic Information</div>
            <div className="info-grid">
              <InfoItem label="Grade Level"  value={`Grade ${s.gradeLevel} (${s.gradeLevel <= 10 ? "JHS" : "SHS"})`} />
              <InfoItem label="School Year"  value={s.schoolYear} />
              {isSHS && <InfoItem label="Strand" value={s.strand ? STRAND_LABELS[s.strand] : undefined} />}
              {isSHS && <InfoItem label="Track"  value={s.track} />}
              <InfoItem label="Status"       value={STATUS_LABELS[s.status]} />
            </div>
            {s.remarks && (
              <div style={{ marginTop: "0.75rem" }}>
                <div className="info-label">Remarks</div>
                <div className="info-value" style={{ lineHeight: 1.6 }}>{s.remarks}</div>
              </div>
            )}
          </div>

          {/* Guardian */}
          <div className="info-section">
            <div className="info-section-title">Guardian / Parent Information</div>
            <div className="info-grid">
              <InfoItem label="Name"         value={s.guardian?.name} />
              <InfoItem label="Relationship" value={s.guardian?.relationship} />
              <InfoItem label="Contact No."  value={s.guardian?.contactNo} />
              <InfoItem label="Email"        value={s.guardian?.email} />
              <InfoItem label="Occupation"   value={s.guardian?.occupation} />
            </div>
          </div>

          {/* Meta */}
          <div className="info-section">
            <div className="info-section-title">Record</div>
            <div className="info-grid">
              <InfoItem label="Enrolled"     value={new Date(s.createdAt).toLocaleDateString("en-PH")} />
              <InfoItem label="Last Updated" value={new Date(s.updatedAt).toLocaleDateString("en-PH")} />
            </div>
          </div>
        </div>

        <div className="drawer-footer">
          {nextStatuses.length > 0 && (
            <div style={{ marginRight: "auto", display: "flex", gap: "0.5rem" }}>
              {nextStatuses.map(st => (
                <button key={st} className="btn btn-outline btn-sm" onClick={() => onStatus(st)}>
                  Mark as {STATUS_LABELS[st as Student["status"]]}
                </button>
              ))}
            </div>
          )}
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
          <button className="btn btn-primary btn-sm" onClick={onEdit}>✎ Edit</button>
        </div>
      </div>
    </>
  );
}
