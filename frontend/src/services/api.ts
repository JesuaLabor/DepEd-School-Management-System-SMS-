import type {
  LoginResponse, User, Student, StudentListResponse,
  Enrollment, EnrollmentListResponse, EnrollmentSummary,
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
};
