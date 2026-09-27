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

export type Strand = "" | "academic" | "tvl" | "sports" | "arts_design";

export interface Student {
  id:         string;
  lrn:        string;
  firstName:  string;
  lastName:   string;
  middleName?: string;
  birthDate:  string;
  sex:        string;
  gradeLevel: number;
  strand?:    Strand;
  sectionId?: string;
  schoolId:   string;
  status:     "enrolled" | "dropped" | "transferred" | "graduated";
  createdAt:  string;
  updatedAt:  string;
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
