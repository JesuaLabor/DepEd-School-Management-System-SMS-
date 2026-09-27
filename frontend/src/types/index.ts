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
