import type {
  LoginResponse, User, Student, StudentListResponse,
  Enrollment, EnrollmentListResponse, EnrollmentSummary,
  AttendanceRecord, AttendanceWithStudent, AttendanceSummaryStats,
  DailyReportResponse, AbsenceReportRow, AttendanceFilters,
  BatchAttendanceRequest, AttendanceStatus,
} from "@/types";

const BASE_URL = "/api/v1";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...options.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type StudentFilters = {
  gradeLevel?: number; strand?: string; status?: string;
  schoolYear?: string; search?: string; limit?: number; skip?: number;
};

export type EnrollmentFilters = {
  schoolYear?: string; gradeLevel?: number; status?: string;
  type?: string; search?: string; limit?: number; skip?: number;
};

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
    me: () => request<User>("/auth/me"),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ status: string }>("/auth/change-password", {
        method: "POST", body: JSON.stringify({ currentPassword, newPassword }),
      }),
  },
  users: {
    list:      ()                => request<User[]>("/users"),
    get:       (id: string)      => request<User>(`/users/${id}`),
    update:    (id: string, data: Partial<Pick<User, "firstName" | "lastName" | "role">>) =>
      request<User>(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    setActive: (id: string, isActive: boolean) =>
      request<{ id: string; isActive: boolean }>(`/users/${id}/status`, {
        method: "PATCH", body: JSON.stringify({ isActive }),
      }),
  },
  students: {
    list: (filters: StudentFilters = {}) => {
      const p = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== "") p.set(k, String(v)); });
      return request<StudentListResponse>(`/students?${p}`);
    },
    get:       (id: string)                       => request<Student>(`/students/${id}`),
    create:    (data: Partial<Student>)            => request<Student>("/students", { method: "POST", body: JSON.stringify(data) }),
    update:    (id: string, data: Partial<Student>)=> request<Student>(`/students/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    setStatus: (id: string, status: string, remarks?: string) =>
      request<{ status: string }>(`/students/${id}/status`, {
        method: "PATCH", body: JSON.stringify({ status, remarks }),
      }),
    remove: (id: string) => request<{ status: string }>(`/students/${id}`, { method: "DELETE" }),
  },
  enrollments: {
    list: (filters: EnrollmentFilters = {}) => {
      const p = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== "") p.set(k, String(v)); });
      return request<EnrollmentListResponse>(`/enrollments?${p}`);
    },
    get:     (id: string)      => request<Enrollment>(`/enrollments/${id}`),
    create:  (data: {
      studentId: string; schoolYear: string; gradeLevel: number;
      strand?: string; track?: string; type: string; remarks?: string;
    }) => request<Enrollment>("/enrollments", { method: "POST", body: JSON.stringify(data) }),
    approve: (id: string)       => request<{ status: string }>(`/enrollments/${id}/approve`, { method: "PATCH" }),
    reject:  (id: string, reason?: string) =>
      request<{ status: string }>(`/enrollments/${id}/reject`, {
        method: "PATCH", body: JSON.stringify({ reason }),
      }),
    remove:  (id: string)       => request<{ status: string }>(`/enrollments/${id}`, { method: "DELETE" }),
    summary: (schoolYear?: string) => {
      const p = schoolYear ? `?schoolYear=${schoolYear}` : "";
      return request<EnrollmentSummary>(`/enrollments/summary${p}`);
    },
    bulkPromote: (data: {
      fromSchoolYear: string; toSchoolYear: string;
      gradeLevel: number; strand?: string; track?: string;
    }) => request<{ promoted: number; message: string }>("/enrollments/promote", {
      method: "POST", body: JSON.stringify(data),
    }),
  },
  attendance: {
    list: (filters: AttendanceFilters = {}) => {
      const p = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== "") p.set(k, String(v)); });
      return request<{ data: AttendanceWithStudent[]; total: number }>(`/attendance?${p}`);
    },
    batchRecord: (data: BatchAttendanceRequest) =>
      request<{ upserted: number; modified: number; total: number }>("/attendance/batch", {
        method: "POST", body: JSON.stringify(data),
      }),
    dailyReport: (params: { date: string; gradeLevel: number; schoolYear?: string; type?: string }) => {
      const p = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") p.set(k, String(v)); });
      return request<DailyReportResponse>(`/attendance/daily-report?${p}`);
    },
    studentHistory: (studentId: string, params: { dateFrom?: string; dateTo?: string; type?: string; schoolYear?: string } = {}) => {
      const p = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") p.set(k, String(v)); });
      return request<{ data: AttendanceRecord[]; total: number }>(`/attendance/student/${studentId}?${p}`);
    },
    studentSummary: (studentId: string, params: { schoolYear?: string; type?: string } = {}) => {
      const p = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") p.set(k, String(v)); });
      return request<AttendanceSummaryStats>(`/attendance/student/${studentId}/summary?${p}`);
    },
    absenceReport: (params: { schoolYear: string; gradeLevel?: number; threshold?: number }) => {
      const p = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") p.set(k, String(v)); });
      return request<{ data: AbsenceReportRow[]; threshold: number; schoolYear: string }>(`/attendance/absence-report?${p}`);
    },
    update: (id: string, data: { status: AttendanceStatus; remarks?: string }) =>
      request<AttendanceRecord>(`/attendance/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) =>
      request<{ status: string }>(`/attendance/${id}`, { method: "DELETE" }),
  },
};

