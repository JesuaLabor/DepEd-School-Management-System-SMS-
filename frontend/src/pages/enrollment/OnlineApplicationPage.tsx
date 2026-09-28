import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/services/api";
import type { ApplyAdmissionInput, Strand } from "@/types";

export default function OnlineApplicationPage() {
  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedAppNo, setSubmittedAppNo] = useState<string | null>(null);

  // Form State
  const [hasLrn, setHasLrn] = useState(true);
  const [lrn, setLrn] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [extName, setExtName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [sex, setSex] = useState<"Male" | "Female">("Male");
  const [civilStatus, setCivilStatus] = useState("Single");
  const [religion, setReligion] = useState("");
  const [motherTongue, setMotherTongue] = useState("");
  const [nationality, setNationality] = useState("Filipino");
  const [contactNo, setContactNo] = useState("");
  const [email, setEmail] = useState("");
  const [psaBirthCertNo, setPsaBirthCertNo] = useState("");

  // Address
  const [houseNo, setHouseNo] = useState("");
  const [street, setStreet] = useState("");
  const [barangay, setBarangay] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Academic Info
  const [targetGradeLevel, setTargetGradeLevel] = useState<number>(7);
  const [strand, setStrand] = useState<Strand | "">("");
  const [previousSchool, setPreviousSchool] = useState("");
  const [previousSchoolId, setPreviousSchoolId] = useState("");

  // Guardian Info
  const [guardianName, setGuardianName] = useState("");
  const [guardianRel, setGuardianRel] = useState("Mother");
  const [guardianContact, setGuardianContact] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianOccupation, setGuardianOccupation] = useState("");

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasLrn && (!lrn || lrn.length !== 12 || !/^\d+$/.test(lrn))) {
      setError("Please provide a valid 12-digit Learner Reference Number (LRN).");
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetGradeLevel >= 11 && !strand) {
      setError("Please select your Senior High School Track/Strand specialization.");
      return;
    }
    setError(null);
    setStep(3);
  };

  const handleNextStep3 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardianName.trim() || !guardianContact.trim()) {
      setError("Please fill in required guardian emergency contact details.");
      return;
    }
    setError(null);
    setStep(4);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const payload: ApplyAdmissionInput = {
        hasLrn,
        lrn: hasLrn ? lrn.trim() : undefined,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        middleName: middleName.trim() || undefined,
        extName: extName.trim() || undefined,
        birthDate,
        birthPlace: birthPlace.trim() || undefined,
        sex,
        civilStatus,
        religion: religion.trim() || undefined,
        motherTongue: motherTongue.trim() || undefined,
        nationality,
        contactNo: contactNo.trim() || undefined,
        email: email.trim() || undefined,
        psaBirthCertNo: psaBirthCertNo.trim() || undefined,
        address: {
          houseNo: houseNo.trim() || undefined,
          street: street.trim() || undefined,
          barangay: barangay.trim(),
          city: city.trim(),
          province: province.trim(),
          region: region.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
        },
        targetGradeLevel,
        strand: targetGradeLevel >= 11 && strand ? (strand as Strand) : undefined,
        previousSchool: previousSchool.trim() || undefined,
        previousSchoolId: previousSchoolId.trim() || undefined,
        guardian: {
          name: guardianName.trim(),
          relationship: guardianRel,
          contactNo: guardianContact.trim(),
          email: guardianEmail.trim() || undefined,
          occupation: guardianOccupation.trim() || undefined,
        },
      };

      const res = await api.admissions.apply(payload);
      setSubmittedAppNo(res.applicationNo);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit application.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedAppNo) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem", background: "var(--clr-bg)" }}>
        <div className="card" style={{ maxWidth: "600px", width: "100%", padding: "2.5rem 2rem", textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(34,197,94,0.15)", color: "var(--clr-success)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", margin: "0 auto 1.25rem" }}>
            ✓
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            Application Submitted!
          </h2>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "1.5rem" }}>
            Your enrollment application has been registered with the School Registrar.
          </p>

          <div style={{ padding: "1.25rem", background: "var(--clr-surface-2)", borderRadius: "8px", border: "1px dashed var(--clr-border)", marginBottom: "1.75rem" }}>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--clr-text-muted)", fontWeight: 600 }}>
              Official Application Reference Number
            </div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--clr-accent)", letterSpacing: "0.05em", marginTop: "0.25rem" }}>
              {submittedAppNo}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)", marginTop: "0.5rem" }}>
              Please save this application number. You may be asked to present it upon submitting your physical documents.
            </div>
          </div>

          <div style={{ textAlign: "left", background: "var(--clr-surface)", padding: "1rem 1.25rem", borderRadius: "8px", marginBottom: "1.5rem", fontSize: "0.825rem", color: "var(--clr-text)" }}>
            <div style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--clr-accent)" }}>📁 Next Steps & Required Documents:</div>
            <ul style={{ paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.35rem", color: "var(--clr-text-muted)" }}>
              <li>Photocopy of PSA / NSO Birth Certificate</li>
              <li>Original SF9 (Form 138) Learner Progress Report Card from previous school</li>
              <li>Certificate of Good Moral Character (for transferees)</li>
              <li>1x1 or 2x2 ID Pictures (white background)</li>
            </ul>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button className="btn btn-outline" onClick={() => window.print()}>
              🖨️ Print Confirmation
            </button>
            <Link to="/login" className="btn btn-primary">
              Return to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--clr-bg)", padding: "2.5rem 1rem" }}>
      <div style={{ maxWidth: "780px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{ width: "36px", height: "36px", background: "linear-gradient(135deg, var(--clr-primary), var(--clr-accent))", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800 }}>
              D
            </div>
            <span style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.02em" }}>DepEd Secondary School Management</span>
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0 }}>
            Online Learner Admission & Pre-Enrollment
          </h1>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "0.9rem", marginTop: "0.4rem" }}>
            Official electronic intake for Junior High (Grades 7–10) and Senior High (Grades 11–12) learners.
          </p>
        </div>

        {/* Stepper Header */}
        <div style={{ display: "flex", justifyContent: "space-between", position: "relative", marginBottom: "2rem" }}>
          {[
            { num: 1, label: "Learner Identity" },
            { num: 2, label: "Academic Placement" },
            { num: 3, label: "Address & Guardian" },
            { num: 4, label: "Review & Submit" },
          ].map((s) => (
            <div key={s.num} style={{ flex: 1, textAlign: "center", position: "relative" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: step >= s.num ? "var(--clr-primary)" : "var(--clr-surface-2)",
                  color: step >= s.num ? "#fff" : "var(--clr-text-muted)",
                  border: `2px solid ${step >= s.num ? "var(--clr-primary)" : "var(--clr-border)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  margin: "0 auto 0.5rem",
                  transition: "all 0.3s ease",
                }}
              >
                {step > s.num ? "✓" : s.num}
              </div>
              <span style={{ fontSize: "0.75rem", fontWeight: step === s.num ? 700 : 500, color: step >= s.num ? "var(--clr-text)" : "var(--clr-text-muted)" }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div className="card mb-6" style={{ borderLeft: "4px solid var(--clr-danger)", background: "rgba(239,68,68,0.08)", color: "var(--clr-danger)", padding: "0.75rem 1rem", fontSize: "0.875rem" }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── STEP 1: Learner Identity ── */}
        {step === 1 && (
          <form onSubmit={handleNextStep1} className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "2rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, borderBottom: "1px solid var(--clr-border-soft)", paddingBottom: "0.75rem", margin: 0 }}>
              1. Learner Personal Details & DepEd LRN
            </h2>

            {/* LRN Toggle */}
            <div style={{ padding: "0.85rem 1rem", background: "var(--clr-surface-2)", borderRadius: "8px", border: "1px solid var(--clr-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <input
                  type="checkbox"
                  id="hasLrn"
                  checked={hasLrn}
                  onChange={(e) => setHasLrn(e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <label htmlFor="hasLrn" style={{ fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }}>
                  Learner has an existing 12-digit DepEd Learner Reference Number (LRN)
                </label>
              </div>
              {hasLrn ? (
                <div style={{ marginTop: "0.75rem" }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter 12-digit LRN (e.g. 109283746501)"
                    maxLength={12}
                    value={lrn}
                    onChange={(e) => setLrn(e.target.value.replace(/\D/g, ""))}
                    required
                  />
                  <span style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", marginTop: 4, display: "block" }}>
                    Found on your previous school's Form 137 or Form 138 (SF9) report card.
                  </span>
                </div>
              ) : (
                <div style={{ fontSize: "0.775rem", color: "var(--clr-accent)", marginTop: "0.5rem" }}>
                  ℹ️ A provisional 12-digit LRN will be generated and confirmed by the registrar upon enrollment.
                </div>
              )}
            </div>

            {/* Name Fields */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input type="text" className="form-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input type="text" className="form-input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Middle Name</label>
                <input type="text" className="form-input" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
              </div>
              <div className="form-group" style={{ maxWidth: "90px" }}>
                <label className="form-label">Ext Name</label>
                <input type="text" className="form-input" placeholder="Jr., III" value={extName} onChange={(e) => setExtName(e.target.value)} />
              </div>
            </div>

            {/* Demographics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Birth Date *</label>
                <input type="date" className="form-input" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Sex *</label>
                <select className="form-select" value={sex} onChange={(e) => setSex(e.target.value as "Male" | "Female")}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">PSA Birth Certificate No.</label>
                <input type="text" className="form-input" placeholder="PSA registry number" value={psaBirthCertNo} onChange={(e) => setPsaBirthCertNo(e.target.value)} />
              </div>
            </div>

            {/* Additional Demographics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Place of Birth</label>
                <input type="text" className="form-input" placeholder="City / Municipality" value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Mother Tongue</label>
                <input type="text" className="form-input" placeholder="e.g. Tagalog, Bisaya" value={motherTongue} onChange={(e) => setMotherTongue(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Religion</label>
                <input type="text" className="form-input" placeholder="e.g. Roman Catholic" value={religion} onChange={(e) => setReligion(e.target.value)} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Civil Status</label>
                <select className="form-select" value={civilStatus} onChange={(e) => setCivilStatus(e.target.value)}>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nationality</label>
                <input type="text" className="form-input" value={nationality} onChange={(e) => setNationality(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Learner Contact No.</label>
                <input type="text" className="form-input" placeholder="09XX-XXX-XXXX" value={contactNo} onChange={(e) => setContactNo(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Learner Email</label>
                <input type="email" className="form-input" placeholder="learner@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
              <Link to="/login" className="btn btn-outline">
                Cancel & Login
              </Link>
              <button type="submit" className="btn btn-primary">
                Next: Academic Program →
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 2: Academic Placement ── */}
        {step === 2 && (
          <form onSubmit={handleNextStep2} className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "2rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, borderBottom: "1px solid var(--clr-border-soft)", paddingBottom: "0.75rem", margin: 0 }}>
              2. Academic Placement & Track Selection
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Target Grade Level *</label>
                <select className="form-select" value={targetGradeLevel} onChange={(e) => setTargetGradeLevel(Number(e.target.value))}>
                  <option value={7}>Grade 7 (Junior High)</option>
                  <option value={8}>Grade 8 (Junior High)</option>
                  <option value={9}>Grade 9 (Junior High)</option>
                  <option value={10}>Grade 10 (Junior High)</option>
                  <option value={11}>Grade 11 (Senior High)</option>
                  <option value={12}>Grade 12 (Senior High)</option>
                </select>
              </div>

              {targetGradeLevel >= 11 && (
                <div className="form-group">
                  <label className="form-label">Senior High Track / Strand *</label>
                  <select className="form-select" value={strand} onChange={(e) => setStrand(e.target.value as Strand)} required>
                    <option value="">-- Choose SHS Strand --</option>
                    <option value="academic">Academic Track (STEM / ABM / HUMSS / GAS)</option>
                    <option value="tvl">Technical-Vocational-Livelihood (TVL / ICT)</option>
                    <option value="sports">Sports Track</option>
                    <option value="arts_design">Arts and Design Track</option>
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Previous School Attended</label>
                <input type="text" className="form-input" placeholder="e.g. San Roque National High School" value={previousSchool} onChange={(e) => setPreviousSchool(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">School ID</label>
                <input type="text" className="form-input" placeholder="6-digit ID" value={previousSchoolId} onChange={(e) => setPreviousSchoolId(e.target.value)} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
              <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button type="submit" className="btn btn-primary">
                Next: Address & Guardian →
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 3: Address & Guardian Details ── */}
        {step === 3 && (
          <form onSubmit={handleNextStep3} className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "2rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, borderBottom: "1px solid var(--clr-border-soft)", paddingBottom: "0.75rem", margin: 0 }}>
              3. Residential Address & Emergency Guardian
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">House / Unit No.</label>
                <input type="text" className="form-input" placeholder="e.g. Blk 1 Lot 2" value={houseNo} onChange={(e) => setHouseNo(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Street / Sitio</label>
                <input type="text" className="form-input" placeholder="e.g. Mabini St." value={street} onChange={(e) => setStreet(e.target.value)} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Barangay *</label>
                <input type="text" className="form-input" value={barangay} onChange={(e) => setBarangay(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">City / Municipality *</label>
                <input type="text" className="form-input" value={city} onChange={(e) => setCity(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Province *</label>
                <input type="text" className="form-input" value={province} onChange={(e) => setProvince(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Postal / ZIP Code</label>
                <input type="text" className="form-input" placeholder="e.g. 1000" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Administrative Region</label>
              <input type="text" className="form-input" placeholder="e.g. National Capital Region (NCR), Region IV-A" value={region} onChange={(e) => setRegion(e.target.value)} />
            </div>

            {/* Guardian Contacts */}
            <div style={{ borderTop: "1px solid var(--clr-border-soft)", paddingTop: "1rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>Parent / Guardian Information</h3>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Parent / Guardian Full Name *</label>
                  <input type="text" className="form-input" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Relationship *</label>
                  <select className="form-select" value={guardianRel} onChange={(e) => setGuardianRel(e.target.value)}>
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Legal Guardian">Legal Guardian</option>
                    <option value="Grandparent">Grandparent</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginTop: "0.75rem" }}>
                <div className="form-group">
                  <label className="form-label">Contact / Mobile Number *</label>
                  <input type="text" className="form-input" placeholder="09XX-XXX-XXXX" value={guardianContact} onChange={(e) => setGuardianContact(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address (Optional)</label>
                  <input type="email" className="form-input" placeholder="For automated notifications" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Guardian Occupation</label>
                  <input type="text" className="form-input" placeholder="e.g. Employee, Self-employed" value={guardianOccupation} onChange={(e) => setGuardianOccupation(e.target.value)} />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
              <button type="button" className="btn btn-outline" onClick={() => setStep(2)}>
                ← Back
              </button>
              <button type="submit" className="btn btn-primary">
                Next: Review Application →
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 4: Review & Certification ── */}
        {step === 4 && (
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "2rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, borderBottom: "1px solid var(--clr-border-soft)", paddingBottom: "0.75rem", margin: 0 }}>
              4. Review Application Summary & Certification
            </h2>

            <div style={{ background: "var(--clr-surface-2)", padding: "1.25rem", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.85rem" }}>
              <div><strong>Learner:</strong> {lastName}, {firstName} {middleName} {extName} ({sex})</div>
              <div><strong>DepEd LRN:</strong> {hasLrn ? lrn : "New Learner (Provisional LRN requested)"}</div>
              <div><strong>Target Grade:</strong> Grade {targetGradeLevel} {strand ? `(${strand.toUpperCase()})` : ""}</div>
              <div><strong>Address:</strong> {barangay}, {city}, {province}</div>
              <div><strong>Guardian:</strong> {guardianName} ({guardianRel}) · 📞 {guardianContact}</div>
            </div>

            <div style={{ padding: "0.85rem", background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.25)", borderRadius: "6px", fontSize: "0.8rem", color: "var(--clr-text)" }}>
              🔒 <strong>Data Privacy & Truthfulness Certification:</strong> I hereby certify that the above information given is true and correct to the best of my knowledge, and I voluntarily allow the Department of Education to process my information in accordance with Republic Act No. 10173 (Data Privacy Act of 2012).
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
              <button type="button" className="btn btn-outline" onClick={() => setStep(3)} disabled={submitting}>
                ← Back
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting Application..." : "✓ Submit Enrollment Application"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
