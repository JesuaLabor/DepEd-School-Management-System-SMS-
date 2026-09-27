import { useState } from "react";
import type { Student, Strand } from "@/types";
import { STRAND_LABELS } from "@/types";

type Tab = "personal" | "address" | "academic" | "guardian";

interface Props {
  initial?: Partial<Student>;
  onSubmit: (data: Partial<Student>) => Promise<void>;
  onClose:  () => void;
  title:    string;
}

const currentYear = new Date().getFullYear();
const SCHOOL_YEARS = Array.from({ length: 5 }, (_, i) => {
  const y = currentYear - 1 + i;
  return `${y}-${y + 1}`;
});

const STRANDS: Strand[] = ["", "academic", "tvl", "sports", "arts_design"];

export default function StudentForm({ initial = {}, onSubmit, onClose, title }: Props) {
  const [tab, setTab] = useState<Tab>("personal");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [form, setForm] = useState({
    lrn:          initial.lrn          ?? "",
    firstName:    initial.firstName    ?? "",
    lastName:     initial.lastName     ?? "",
    middleName:   initial.middleName   ?? "",
    extName:      initial.extName      ?? "",
    birthDate:    initial.birthDate    ? initial.birthDate.slice(0, 10) : "",
    birthPlace:   initial.birthPlace   ?? "",
    sex:          initial.sex          ?? "",
    civilStatus:  initial.civilStatus  ?? "",
    religion:     initial.religion     ?? "",
    motherTongue: initial.motherTongue ?? "",
    nationality:  initial.nationality  ?? "Filipino",
    contactNo:    initial.contactNo    ?? "",
    email:        initial.email        ?? "",
    // address
    houseNo:      initial.address?.houseNo    ?? "",
    street:       initial.address?.street     ?? "",
    barangay:     initial.address?.barangay   ?? "",
    city:         initial.address?.city       ?? "",
    province:     initial.address?.province   ?? "",
    region:       initial.address?.region     ?? "",
    postalCode:   initial.address?.postalCode ?? "",
    // academic
    gradeLevel:   initial.gradeLevel?.toString() ?? "7",
    strand:       (initial.strand ?? "") as Strand,
    track:        initial.track        ?? "",
    schoolYear:   initial.schoolYear   ?? SCHOOL_YEARS[1],
    remarks:      initial.remarks      ?? "",
    // guardian
    guardianName:         initial.guardian?.name         ?? "",
    guardianRelationship: initial.guardian?.relationship ?? "",
    guardianContactNo:    initial.guardian?.contactNo    ?? "",
    guardianEmail:        initial.guardian?.email        ?? "",
    guardianOccupation:   initial.guardian?.occupation   ?? "",
  });

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSubmit({
        lrn:          form.lrn,
        firstName:    form.firstName,
        lastName:     form.lastName,
        middleName:   form.middleName  || undefined,
        extName:      form.extName     || undefined,
        birthDate:    form.birthDate,
        birthPlace:   form.birthPlace  || undefined,
        sex:          form.sex,
        civilStatus:  form.civilStatus || undefined,
        religion:     form.religion    || undefined,
        motherTongue: form.motherTongue || undefined,
        nationality:  form.nationality || undefined,
        contactNo:    form.contactNo   || undefined,
        email:        form.email       || undefined,
        address: {
          houseNo:    form.houseNo    || undefined,
          street:     form.street     || undefined,
          barangay:   form.barangay,
          city:       form.city,
          province:   form.province,
          region:     form.region     || undefined,
          postalCode: form.postalCode || undefined,
        },
        gradeLevel:   Number(form.gradeLevel),
        strand:       form.strand || undefined,
        track:        form.track  || undefined,
        schoolYear:   form.schoolYear,
        remarks:      form.remarks || undefined,
        guardian: {
          name:         form.guardianName,
          relationship: form.guardianRelationship,
          contactNo:    form.guardianContactNo,
          email:        form.guardianEmail      || undefined,
          occupation:   form.guardianOccupation || undefined,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "personal",  label: "Personal Info" },
    { id: "address",   label: "Address" },
    { id: "academic",  label: "Academic" },
    { id: "guardian",  label: "Guardian" },
  ];

  const inp = (field: string, placeholder?: string, type = "text", required = false) => (
    <input
      className="form-input" type={type} placeholder={placeholder}
      value={(form as Record<string, string>)[field]}
      onChange={(e) => set(field, e.target.value)}
      required={required}
    />
  );

  const gradeLevel = Number(form.gradeLevel);
  const isSHS = gradeLevel >= 11;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: "min(600px,95vw)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
           onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert alert-error" style={{ margin: "0 0 1rem" }}>{error}</div>}

        <div className="form-tabs">
          {tabs.map(t => (
            <button key={t.id} className={`form-tab${tab === t.id ? " active" : ""}`}
              type="button" onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ overflowY: "auto", flex: 1 }}>
          {/* ── Personal Info ─────────────────────────────────────────── */}
          {tab === "personal" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div className="form-group">
                <label className="form-label">LRN <span style={{ color: "var(--clr-danger)" }}>*</span></label>
                {inp("lrn", "12-digit Learner Reference Number", "text", true)}
                <span className="form-hint">12 digits — must be unique per student</span>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Last Name <span style={{ color: "var(--clr-danger)" }}>*</span></label>
                  {inp("lastName", "Dela Cruz", "text", true)}
                </div>
                <div className="form-group">
                  <label className="form-label">First Name <span style={{ color: "var(--clr-danger)" }}>*</span></label>
                  {inp("firstName", "Juan", "text", true)}
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Middle Name</label>
                  {inp("middleName", "Santos")}
                </div>
                <div className="form-group">
                  <label className="form-label">Ext. Name</label>
                  {inp("extName", "Jr., Sr., III")}
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Birth Date <span style={{ color: "var(--clr-danger)" }}>*</span></label>
                  {inp("birthDate", "", "date", true)}
                </div>
                <div className="form-group">
                  <label className="form-label">Sex <span style={{ color: "var(--clr-danger)" }}>*</span></label>
                  <select className="form-select" value={form.sex} required
                    onChange={(e) => set("sex", e.target.value)}>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Birth Place</label>
                  {inp("birthPlace", "City/Municipality")}
                </div>
                <div className="form-group">
                  <label className="form-label">Civil Status</label>
                  <select className="form-select" value={form.civilStatus} onChange={(e) => set("civilStatus", e.target.value)}>
                    <option value="">Select</option>
                    {["Single","Married","Widowed","Separated"].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Religion</label>
                  {inp("religion", "e.g. Roman Catholic")}
                </div>
                <div className="form-group">
                  <label className="form-label">Mother Tongue</label>
                  {inp("motherTongue", "e.g. Filipino, Cebuano")}
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Contact No.</label>
                  {inp("contactNo", "09XXXXXXXXX")}
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  {inp("email", "student@email.com", "email")}
                </div>
              </div>
            </div>
          )}

          {/* ── Address ───────────────────────────────────────────────── */}
          {tab === "address" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">House / Unit No.</label>
                  {inp("houseNo", "123")}
                </div>
                <div className="form-group">
                  <label className="form-label">Street</label>
                  {inp("street", "Rizal Ave.")}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Barangay <span style={{ color: "var(--clr-danger)" }}>*</span></label>
                {inp("barangay", "Barangay 1", "text", true)}
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">City / Municipality <span style={{ color: "var(--clr-danger)" }}>*</span></label>
                  {inp("city", "Quezon City", "text", true)}
                </div>
                <div className="form-group">
                  <label className="form-label">Province <span style={{ color: "var(--clr-danger)" }}>*</span></label>
                  {inp("province", "Metro Manila", "text", true)}
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Region</label>
                  {inp("region", "NCR")}
                </div>
                <div className="form-group">
                  <label className="form-label">Postal Code</label>
                  {inp("postalCode", "1100")}
                </div>
              </div>
            </div>
          )}

          {/* ── Academic ──────────────────────────────────────────────── */}
          {tab === "academic" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Grade Level <span style={{ color: "var(--clr-danger)" }}>*</span></label>
                  <select className="form-select" value={form.gradeLevel} required
                    onChange={(e) => set("gradeLevel", e.target.value)}>
                    {[7,8,9,10,11,12].map(g => (
                      <option key={g} value={g}>Grade {g} {g <= 10 ? "(JHS)" : "(SHS)"}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">School Year <span style={{ color: "var(--clr-danger)" }}>*</span></label>
                  <select className="form-select" value={form.schoolYear}
                    onChange={(e) => set("schoolYear", e.target.value)}>
                    {SCHOOL_YEARS.map(sy => <option key={sy} value={sy}>{sy}</option>)}
                  </select>
                </div>
              </div>
              {isSHS && (
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Strand</label>
                    <select className="form-select" value={form.strand}
                      onChange={(e) => set("strand", e.target.value)}>
                      {STRANDS.map(s => <option key={s} value={s}>{STRAND_LABELS[s]}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Track</label>
                    {inp("track", "e.g. Academic, TVL")}
                  </div>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Remarks</label>
                <textarea className="form-input" rows={3} placeholder="Any additional notes…"
                  value={form.remarks} onChange={(e) => set("remarks", e.target.value)} />
              </div>
            </div>
          )}

          {/* ── Guardian ──────────────────────────────────────────────── */}
          {tab === "guardian" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div className="form-group">
                <label className="form-label">Guardian's Full Name <span style={{ color: "var(--clr-danger)" }}>*</span></label>
                {inp("guardianName", "Maria Dela Cruz", "text", true)}
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Relationship <span style={{ color: "var(--clr-danger)" }}>*</span></label>
                  <select className="form-select" value={form.guardianRelationship} required
                    onChange={(e) => set("guardianRelationship", e.target.value)}>
                    <option value="">Select</option>
                    {["Mother","Father","Lola","Lolo","Aunt","Uncle","Sibling","Legal Guardian","Other"].map(r => (
                      <option key={r} value={r.toLowerCase()}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Contact No. <span style={{ color: "var(--clr-danger)" }}>*</span></label>
                  {inp("guardianContactNo", "09XXXXXXXXX", "text", true)}
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  {inp("guardianEmail", "guardian@email.com", "email")}
                </div>
                <div className="form-group">
                  <label className="form-label">Occupation</label>
                  {inp("guardianOccupation", "e.g. Teacher, Farmer")}
                </div>
              </div>
            </div>
          )}

          {/* Always-visible footer actions */}
          <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0 }}>
            {tab !== "personal" && (
              <button type="button" className="btn btn-outline" onClick={() => {
                const order: Tab[] = ["personal","address","academic","guardian"];
                setTab(order[order.indexOf(tab) - 1]);
              }}>← Back</button>
            )}
            {tab !== "guardian" ? (
              <button type="button" className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => {
                const order: Tab[] = ["personal","address","academic","guardian"];
                setTab(order[order.indexOf(tab) + 1]);
              }}>Next →</button>
            ) : (
              <>
                <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Saving…" : "Save Student"}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
