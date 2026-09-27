export type Role = "super_admin" | "registrar" | "teacher" | "student" | "guardian";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  schoolId?: string;
  createdAt: string;
  updatedAt: string;
}

export type Strand = "" | "academic" | "tvl" | "sports" | "arts_design";

export interface Student {
  id: string;
  lrn: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  birthDate: string;
  sex: string;
  gradeLevel: number; // 7-12
  strand?: Strand; // SHS only
  sectionId?: string;
  schoolId: string;
  status: "enrolled" | "dropped" | "transferred" | "graduated";
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}
