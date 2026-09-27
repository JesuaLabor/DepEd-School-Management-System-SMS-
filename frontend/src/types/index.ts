export type Role = "super_admin" | "registrar" | "teacher" | "student" | "guardian";

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  registrar:   "Registrar",
  teacher:     "Teacher",
  student:     "Student",
  guardian:    "Guardian / Parent",
};

export interface User {
  id:        string;
  email:     string;
  firstName: string;
  lastName:  string;
  role:      Role;
  schoolId?: string;
  isActive:  boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Student / SIS ────────────────────────────────────────────────────────────

export type Strand = "" | "academic" | "tvl" | "sports" | "arts_design";

export const STRAND_LABELS: Record<Strand, string> = {
  "":           "—",
  academic:     "Academic",
  tvl:          "Technical-Vocational-Livelihood",
  sports:       "Sports",
  arts_design:  "Arts & Design",
};

export type EnrollmentStatus = "enrolled" | "dropped" | "transferred" | "graduated";

export const STATUS_LABELS: Record<EnrollmentStatus, string> = {
  enrolled:    "Enrolled",
  dropped:     "Dropped",
  transferred: "Transferred",
  graduated:   "Graduated",
};

export interface Address {
  houseNo?:    string;
  street?:     string;
  barangay:    string;
  city:        string;
  province:    string;
  region?:     string;
  postalCode?: string;
}

export interface Guardian {
  name:         string;
  relationship: string;
  contactNo:    string;
  email?:       string;
  occupation?:  string;
}

export interface Student {
  id:           string;
  lrn:          string;
  firstName:    string;
  lastName:     string;
  middleName?:  string;
  extName?:     string;
  birthDate:    string;
  birthPlace?:  string;
  sex:          string;
  civilStatus?: string;
  religion?:    string;
  motherTongue?: string;
  nationality?: string;
  contactNo?:   string;
  email?:       string;
  address:      Address;
  gradeLevel:   number;
  strand?:      Strand;
  track?:       string;
  sectionId?:   string;
  schoolYear:   string;
  status:       EnrollmentStatus;
  remarks?:     string;
  guardian:     Guardian;
  schoolId?:    string;
  createdAt:    string;
  updatedAt:    string;
}

export interface StudentListResponse {
  data:  Student[];
  total: number;
}

export interface LoginResponse {
  token: string;
  user:  User;
}

export interface TokenPayload {
  sub:  string;
  role: Role;
  exp:  number;
}

// ── Enrollment ────────────────────────────────────────────────────────────────

export type EnrollmentRecordStatus = "pending" | "approved" | "rejected";
export type EnrollmentType = "new" | "returning" | "transferee" | "promotion";

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentRecordStatus, string> = {
  pending:  "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export const ENROLLMENT_TYPE_LABELS: Record<EnrollmentType, string> = {
  new:        "New Student",
  returning:  "Returning",
  transferee: "Transferee",
  promotion:  "Promotion",
};

export interface StudentSummary {
  id:          string;
  lrn:         string;
  firstName:   string;
  lastName:    string;
  middleName?: string;
  sex:         string;
  birthDate:   string;
}

export interface Enrollment {
  id:              string;
  studentId:       string;
  schoolYear:      string;
  gradeLevel:      number;
  strand?:         Strand;
  track?:          string;
  sectionId?:      string;
  type:            EnrollmentType;
  status:          EnrollmentRecordStatus;
  remarks?:        string;
  rejectedReason?: string;
  processedBy?:    string;
  processedAt?:    string;
  schoolId?:       string;
  createdAt:       string;
  updatedAt:       string;
  student?:        StudentSummary;
}

export interface EnrollmentListResponse {
  data:  Enrollment[];
  total: number;
}

export interface EnrollmentSummary {
  summary:        { pending: number; approved: number; rejected: number; total: number };
  gradeBreakdown: { grade: number; count: number }[];
}

// ── Attendance ────────────────────────────────────────────────────────────────

export type AttendanceStatus = "present" | "absent" | "late" | "excused";
export type AttendanceType   = "daily" | "subject";

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  absent:  "Absent",
  late:    "Late",
  excused: "Excused",
};

export const ATTENDANCE_STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: "var(--clr-success)",
  absent:  "var(--clr-danger)",
  late:    "var(--clr-warning)",
  excused: "var(--clr-info)",
};

export interface AttendanceRecord {
  id:           string;
  studentId:    string;
  date:         string;
  type:         AttendanceType;
  subjectName?: string;
  status:       AttendanceStatus;
  remarks?:     string;
  gradeLevel:   number;
  schoolYear:   string;
  recordedBy?:  string;
  createdAt:    string;
  updatedAt:    string;
}

export interface AttendanceWithStudent extends AttendanceRecord {
  student?: StudentSummary;
}

export interface AttendanceSummaryStats {
  studentId:   string;
  present:     number;
  absent:      number;
  late:        number;
  excused:     number;
  total:       number;
  absenceRate: number;
}

export interface DailyReportResponse {
  date:       string;
  gradeLevel: number;
  students:   StudentSummary[];
  records:    Record<string, AttendanceWithStudent>;
  summary:    { present: number; absent: number; late: number; excused: number; unrecorded: number };
}

export interface AbsenceReportRow {
  _id:         string;
  absences:    number;
  grade_level: number;
  last_absent: string;
  student:     StudentSummary;
}

export interface AttendanceFilters {
  studentId?:  string;
  date?:       string;
  dateFrom?:   string;
  dateTo?:     string;
  gradeLevel?: number;
  status?:     AttendanceStatus;
  type?:       AttendanceType;
  schoolYear?: string;
  limit?:      number;
  skip?:       number;
}

export interface BatchAttendanceEntry {
  studentId: string;
  status:    AttendanceStatus;
  remarks?:  string;
}

export interface BatchAttendanceRequest {
  date:         string;
  gradeLevel:   number;
  schoolYear:   string;
  type?:        AttendanceType;
  subjectName?: string;
  records:      BatchAttendanceEntry[];
}


// ── Sections & Advisory ───────────────────────────────────────────────────────

export interface AdviserSummary {
  id:        string;
  firstName: string;
  lastName:  string;
  email:     string;
}

export interface Section {
  id:          string;
  name:        string;
  gradeLevel:  number;
  schoolYear:  string;
  strand?:     Strand;
  track?:      string;
  adviserId?:  string;
  room?:       string;
  maxCapacity: number;
  schoolId?:   string;
  createdAt:   string;
  updatedAt:   string;
}

export interface SectionWithAdviser extends Section {
  adviser?:      AdviserSummary;
  studentCount:  number;
  maleCount:     number;
  femaleCount:   number;
}

export interface SectionRoster {
  section:     SectionWithAdviser;
  students:    Student[];
  totalMale:   number;
  totalFemale: number;
  totalCount:  number;
}

export interface SectionFilters {
  schoolYear?: string;
  gradeLevel?: number;
  strand?:     string;
  adviserId?:  string;
  search?:     string;
}

export interface CreateSectionInput {
  name:        string;
  gradeLevel:  number;
  schoolYear:  string;
  strand?:     Strand;
  track?:      string;
  adviserId?:  string;
  room?:       string;
  maxCapacity: number;
}
