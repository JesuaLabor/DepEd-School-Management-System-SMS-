import type { LoginResponse, User, Student } from "@/types";

const BASE_URL = "/api/v1";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    me: () => request<User>("/auth/me"),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ status: string }>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
  },
  users: {
    list: () => request<User[]>("/users"),
    get: (id: string) => request<User>(`/users/${id}`),
    update: (id: string, data: Partial<Pick<User, "firstName" | "lastName" | "role">>) =>
      request<User>(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    setActive: (id: string, isActive: boolean) =>
      request<{ id: string; isActive: boolean }>(`/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      }),
  },
  students: {
    list: (gradeLevel?: number) =>
      request<Student[]>(`/students${gradeLevel ? `?gradeLevel=${gradeLevel}` : ""}`),
    get: (id: string) => request<Student>(`/students/${id}`),
    create: (data: Partial<Student>) =>
      request<Student>("/students", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Student>) =>
      request<{ status: string }>(`/students/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    remove: (id: string) =>
      request<{ status: string }>(`/students/${id}`, { method: "DELETE" }),
  },
};
