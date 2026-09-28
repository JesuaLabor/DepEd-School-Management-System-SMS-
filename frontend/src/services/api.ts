import type {
  LoginResponse, User, Role, Student, StudentListResponse,
  Enrollment, EnrollmentListResponse, EnrollmentSummary,
  AttendanceRecord, AttendanceWithStudent, AttendanceSummaryStats,
  DailyReportResponse, AbsenceReportRow, AttendanceFilters,
  BatchAttendanceRequest, AttendanceStatus,
  SectionWithAdviser, SectionRoster, SectionFilters,
  CreateSectionInput, AdviserSummary, Section,
  Subject, GradeRecord, SectionGradeSheetResponse,
  BatchQuarterRequest, LearnerSF9, GradingWeights, CalculateQuarterInput, CalculateQuarterResponse,
  SchoolFormSF2, SchoolFormSF10,
  AnalyticsOverview,
  Announcement, AnnouncementFilters, AnnouncementListResponse, CreateAnnouncementInput,
  CreateScheduleSlotInput, ScheduleSlot, SectionScheduleResponse, TeacherLoadSummary,
  PortalMyResponse, StudentOverviewResponse,
  AdmissionApplication, AdmissionFilters, AdmissionListResponse, ApplyAdmissionInput, ApplicationStatus,
  AbsenceAlert, Conversation, Message, ConversationDetailResponse, StartConversationInput, SendReplyInput, RecipientOption,
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
    depedSSO: (payload: { idToken?: string; email?: string; firstName?: string; lastName?: string; provider?: string }) =>
      request<{ token: string; user: User; isNewUser: boolean; provider: string }>("/auth/deped-sso", {
        method: "POST", body: JSON.stringify(payload),
      }),
    getSSOConfig: () =>
      request<{ googleClientId: string; allowedDomain: string; devMode: boolean }>("/auth/sso/config"),
  },
  users: {
    list:      ()                => request<User[]>("/users"),
    get:       (id: string)      => request<User>(`/users/${id}`),
    create:    (data: { email: string; password?: string; firstName: string; lastName: string; role: Role }) =>
      request<User>("/users", { method: "POST", body: JSON.stringify(data) }),
    bulkImport: (payload: {
      users: Array<{ firstName: string; lastName: string; email: string; password?: string; role?: Role }>;
      skipExisting?: boolean;
    }) =>
      request<{
        total: number;
        createdCount: number;
        skippedCount: number;
        failedCount: number;
        errors: Array<{ row: number; email: string; reason: string }>;
        users: User[];
      }>("/users/bulk-import", { method: "POST", body: JSON.stringify(payload) }),
    update:    (id: string, data: Partial<Pick<User, "firstName" | "lastName" | "role">>) =>
      request<User>(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    setActive: (id: string, isActive: boolean) =>
      request<{ id: string; isActive: boolean }>(`/users/${id}/status`, {
        method: "PATCH", body: JSON.stringify({ isActive }),
      }),
    resetPassword: (id: string, newPassword: string) =>
      request<{ status: string; message: string; userId: string; email: string }>(`/users/${id}/reset-password`, {
        method: "POST", body: JSON.stringify({ newPassword }),
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
    alerts: (params: { date?: string; studentId?: string; limit?: number } = {}) => {
      const p = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") p.set(k, String(v)); });
      return request<{ data: AbsenceAlert[]; total: number }>(`/attendance/alerts?${p}`);
    },
    sendSMS: (data: { recipient: string; message: string; studentId?: string }) =>
      request<{ messageId: string; recipient: string; status: string; provider: string }>("/attendance/send-sms", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  sections: {
    list: (filters: SectionFilters = {}) => {
      const p = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== "") p.set(k, String(v)); });
      return request<{ data: SectionWithAdviser[]; total: number }>(`/sections?${p}`);
    },
    get: (id: string) =>
      request<SectionWithAdviser>(`/sections/${id}`),
    create: (data: CreateSectionInput) =>
      request<Section>("/sections", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<CreateSectionInput>) =>
      request<{ status: string }>(`/sections/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) =>
      request<{ status: string }>(`/sections/${id}`, { method: "DELETE" }),
    roster: (id: string) =>
      request<SectionRoster>(`/sections/${id}/roster`),
    assignStudents: (id: string, studentIds: string[]) =>
      request<{ assigned: number; sectionId: string }>(`/sections/${id}/students`, {
        method: "POST", body: JSON.stringify({ studentIds }),
      }),
    removeStudent: (id: string, studentId: string) =>
      request<{ status: string }>(`/sections/${id}/students/${studentId}`, { method: "DELETE" }),
    unassignedStudents: (params: { gradeLevel: number; schoolYear?: string; search?: string }) => {
      const p = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") p.set(k, String(v)); });
      return request<{ data: Student[]; total: number }>(`/sections/unassigned-students?${p}`);
    },
    teachers: () =>
      request<{ data: AdviserSummary[]; total: number }>("/sections/teachers"),
  },
  grades: {
    subjects: (gradeLevel: number, strand?: string, semester?: number) => {
      const p = new URLSearchParams({ gradeLevel: String(gradeLevel) });
      if (strand) p.set("strand", strand);
      if (semester) p.set("semester", String(semester));
      return request<{ gradeLevel: number; strand?: string; semester?: string; data: Subject[] }>(`/grades/subjects?${p}`);
    },
    sectionSheet: (sectionId: string, subjectCode: string, schoolYear?: string) => {
      const p = new URLSearchParams({ subjectCode });
      if (schoolYear) p.set("schoolYear", schoolYear);
      return request<SectionGradeSheetResponse>(`/grades/section/${sectionId}/sheet?${p}`);
    },
    batchQuarter: (data: BatchQuarterRequest) =>
      request<{ status: string; quarter: string; total: number }>("/grades/batch", {
        method: "POST", body: JSON.stringify(data),
      }),
    studentSF9: (studentId: string, schoolYear?: string) => {
      const p = schoolYear ? `?schoolYear=${schoolYear}` : "";
      return request<LearnerSF9>(`/grades/student/${studentId}/sf9${p}`);
    },
    weights: (gradeLevel: number, subjectCode: string, strand?: string) => {
      const p = new URLSearchParams({ gradeLevel: String(gradeLevel), subjectCode });
      if (strand) p.set("strand", strand);
      return request<GradingWeights>(`/grades/weights?${p}`);
    },
    calculate: (data: CalculateQuarterInput) =>
      request<CalculateQuarterResponse>("/grades/calculate", {
        method: "POST", body: JSON.stringify(data),
      }),
    update: (id: string, data: { q1?: number; q2?: number; q3?: number; q4?: number }) =>
      request<GradeRecord>(`/grades/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },
  schoolForms: {
    sf2: (params: { sectionId: string; month: number; year: number }) => {
      const p = new URLSearchParams({
        sectionId: params.sectionId,
        month:     String(params.month),
        year:      String(params.year),
      });
      return request<SchoolFormSF2>(`/school-forms/sf2?${p}`);
    },
    sf10: (studentId: string) => {
      const p = new URLSearchParams({ studentId });
      return request<SchoolFormSF10>(`/school-forms/sf10?${p}`);
    },
  },
  analytics: {
    overview: () => request<AnalyticsOverview>("/analytics/overview"),
  },
  announcements: {
    list: (params?: AnnouncementFilters) => {
      const p = new URLSearchParams();
      if (params?.scope) p.set("scope", params.scope);
      if (params?.priority) p.set("priority", params.priority);
      if (params?.gradeLevel) p.set("gradeLevel", String(params.gradeLevel));
      if (params?.sectionId) p.set("sectionId", params.sectionId);
      if (params?.search) p.set("search", params.search);
      if (params?.limit) p.set("limit", String(params.limit));
      if (params?.skip) p.set("skip", String(params.skip));
      return request<AnnouncementListResponse>(`/announcements?${p}`);
    },
    create: (data: CreateAnnouncementInput) =>
      request<Announcement>("/announcements", { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) =>
      request<Announcement>(`/announcements/${id}`),
    update: (id: string, data: Partial<CreateAnnouncementInput>) =>
      request<Announcement>(`/announcements/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ status: string }>(`/announcements/${id}`, { method: "DELETE" }),
  },
  schedules: {
    getSection: (sectionId: string) =>
      request<SectionScheduleResponse>(`/schedules/section/${sectionId}`),
    create: (data: CreateScheduleSlotInput) =>
      request<ScheduleSlot>("/schedules", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<CreateScheduleSlotInput>) =>
      request<ScheduleSlot>(`/schedules/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ status: string }>(`/schedules/${id}`, { method: "DELETE" }),
    getTeacher: (teacherId: string) =>
      request<TeacherLoadSummary>(`/schedules/teacher/${teacherId}`),
    teachersLoad: () =>
      request<{ data: TeacherLoadSummary[]; total: number }>("/schedules/teachers-load"),
  },
  portal: {
    me: () => request<PortalMyResponse>("/portal/me"),
    studentOverview: (studentId: string) =>
      request<StudentOverviewResponse>(`/portal/student/${studentId}/overview`),
    studentGrades: (studentId: string) =>
      request<{ studentId: string; grades: GradeRecord[] }>(`/portal/student/${studentId}/grades`),
    studentAttendance: (studentId: string) =>
      request<{ studentId: string; records: AttendanceRecord[]; total: number }>(`/portal/student/${studentId}/attendance`),
    studentSchedule: (studentId: string) =>
      request<{ studentId: string; sectionId: string; slots: ScheduleSlot[]; total: number }>(`/portal/student/${studentId}/schedule`),
  },
  admissions: {
    apply: (data: ApplyAdmissionInput) =>
      request<{ status: string; applicationNo: string; applicationId: string; message: string; application: AdmissionApplication }>("/admissions/apply", {
        method: "POST", body: JSON.stringify(data),
      }),
    list: (params?: AdmissionFilters) => {
      const p = new URLSearchParams();
      if (params?.status) p.set("status", params.status);
      if (params?.gradeLevel) p.set("gradeLevel", String(params.gradeLevel));
      if (params?.schoolYear) p.set("schoolYear", params.schoolYear);
      if (params?.search) p.set("search", params.search);
      if (params?.limit) p.set("limit", String(params.limit));
      if (params?.skip) p.set("skip", String(params.skip));
      return request<AdmissionListResponse>(`/admissions?${p}`);
    },
    get: (id: string) =>
      request<AdmissionApplication>(`/admissions/${id}`),
    updateStatus: (id: string, data: { status: ApplicationStatus; remarks?: string }) =>
      request<{ status: string }>(`/admissions/${id}/status`, { method: "PATCH", body: JSON.stringify(data) }),
    approve: (id: string, data: { assignedLrn?: string; sectionId?: string; remarks?: string }) =>
      request<{ status: string; studentId: string; lrn: string; enrollmentId: string; message: string }>(`/admissions/${id}/approve`, {
        method: "POST", body: JSON.stringify(data),
      }),
  },
  messages: {
    conversations: () =>
      request<{ data: Conversation[] }>("/messages/conversations").then((r) => r.data || (r as unknown as Conversation[])),
    getConversation: (id: string) =>
      request<ConversationDetailResponse>(`/messages/conversations/${id}`),
    start: (data: StartConversationInput) =>
      request<ConversationDetailResponse>("/messages/conversations", {
        method: "POST", body: JSON.stringify(data),
      }),
    reply: (conversationId: string, data: SendReplyInput) =>
      request<Message>(`/messages/conversations/${conversationId}/reply`, {
        method: "POST", body: JSON.stringify(data),
      }),
    recipients: (search?: string) => {
      const p = search ? `?search=${encodeURIComponent(search)}` : "";
      return request<{ data: RecipientOption[] }>(`/messages/recipients${p}`).then((r) => r.data || (r as unknown as RecipientOption[]));
    },
  },
};

