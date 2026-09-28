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

// ── Grading & Assessment (SF9) ────────────────────────────────────────────────

export interface Subject {
  code:       string;
  name:       string;
  gradeLevel: number;
  strand?:    Strand;
  semester?:  number;
}

export interface GradeRecord {
  id:          string;
  studentId:   string;
  sectionId:   string;
  schoolYear:  string;
  gradeLevel:  number;
  subjectCode: string;
  subjectName: string;
  q1?:         number;
  q2?:         number;
  q3?:         number;
  q4?:         number;
  finalGrade?: number;
  remarks?:    string;
  encodedBy?:  string;
  createdAt:   string;
  updatedAt:   string;
}

export interface GradeSheetStats {
  avgQ1:       number;
  avgQ2:       number;
  avgQ3:       number;
  avgQ4:       number;
  avgFinal:    number;
  passedCount: number;
  failedCount: number;
  totalCount:  number;
}

export interface SectionGradeSheetResponse {
  section:     Section;
  subjectCode: string;
  schoolYear:  string;
  students:    StudentSummary[];
  grades:      Record<string, GradeRecord>;
  stats:       GradeSheetStats;
}

export interface BatchQuarterEntry {
  studentId: string;
  grade:     number | null;
}

export interface GradingWeights {
  writtenWork:         number;
  performanceTask:     number;
  quarterlyAssessment: number;
  groupClassification: string;
}

export interface CalculateQuarterInput {
  gradeLevel:  number;
  subjectCode: string;
  strand?:     string;
  wwScore:     number;
  wwTotal:     number;
  ptScore:     number;
  ptTotal:     number;
  qaScore:     number;
  qaTotal:     number;
}

export interface CalculateQuarterResponse {
  weights: GradingWeights;
  breakdown: {
    writtenWork: {
      score: number;
      total: number;
      ps: number;
      ws: number;
      weight: number;
    };
    performanceTask: {
      score: number;
      total: number;
      ps: number;
      ws: number;
      weight: number;
    };
    quarterlyAssessment: {
      score: number;
      total: number;
      ps: number;
      ws: number;
      weight: number;
    };
  };
  initialGrade:    number;
  transmutedGrade: number;
  descriptor:      string;
  passed:          boolean;
}

export interface BatchQuarterRequest {
  sectionId:   string;
  subjectCode: string;
  subjectName: string;
  schoolYear:  string;
  gradeLevel:  number;
  quarter:     "q1" | "q2" | "q3" | "q4";
  entries:     BatchQuarterEntry[];
}

export interface LearnerSF9 {
  student:         Student;
  section:         SectionWithAdviser;
  schoolYear:      string;
  gradeLevel:      number;
  grades:          GradeRecord[];
  generalAverage?: number;
  descriptor?:     string;
  remarks?:        string;
  attendance:      AttendanceSummaryStats;
}

// ── DepEd School Forms (SF2, SF10) ───────────────────────────────────────────

export interface LearnerMonthlyAttendance {
  student:       StudentSummary;
  dailyStatuses: Record<number, string>;
  totalPresent:  number;
  totalAbsent:   number;
  totalLate:     number;
  remarks?:      string;
}

export interface SF2MonthlySummary {
  totalEnrolment:         number;
  maleEnrolment:          number;
  femaleEnrolment:        number;
  totalSchoolDays:        number;
  maleDaysPresent:        number;
  femaleDaysPresent:      number;
  totalDaysPresent:       number;
  averageDailyAttendance: number;
  attendancePercentage:   number;
  consecutiveAbsentCount: number;
}

export interface SchoolFormSF2 {
  section:        SectionWithAdviser;
  month:          number;
  monthName:      string;
  year:           number;
  schoolYear:     string;
  daysInMonth:    number;
  schoolDays:     number[];
  maleLearners:   LearnerMonthlyAttendance[];
  femaleLearners: LearnerMonthlyAttendance[];
  summary:        SF2MonthlySummary;
}

export interface ScholasticYearRecord {
  gradeLevel:     number;
  schoolYear:     string;
  sectionName:    string;
  adviserName:    string;
  grades:         GradeRecord[];
  generalAverage?: number;
  descriptor?:    string;
  remarks?:       string;
}

export interface SchoolFormSF10 {
  student:            Student;
  scholasticHistory:  ScholasticYearRecord[];
  currentGrade:       number;
  graduationEligible: boolean;
}

// ── Analytics & Intelligence Dashboard ────────────────────────────────────────

export interface GradeLevelMetric {
  gradeLevel: number;
  label:      string;
  total:      number;
  male:       number;
  female:     number;
}

export interface TrackStrandMetric {
  strand:     string;
  track:      string;
  count:      number;
  percentage: number;
}

export interface DailyAttendanceMetric {
  date:           string;
  present:        number;
  absent:         number;
  late:           number;
  excused:        number;
  total:          number;
  attendanceRate: number;
}

export interface GradePerformanceMetric {
  outstanding:        number;
  verySatisfactory:   number;
  satisfactory:       number;
  fairlySatisfactory: number;
  didNotMeet:         number;
  totalGrades:        number;
  passingRate:        number;
}

export interface SARDORiskLearner {
  studentId:  string;
  lrn:        string;
  firstName:  string;
  lastName:   string;
  gradeLevel: number;
  sex:        string;
  absences:   number;
  riskLevel:  string;
}

export interface AnalyticsOverview {
  summary: {
    totalStudents:      number;
    enrolledStudents:   number;
    jhsCount:           number;
    shsCount:           number;
    totalMale:          number;
    totalFemale:        number;
    facultyCount:       number;
    sectionsCount:      number;
    attendanceRate:     number;
    criticalSardoCount: number;
    moderateRiskCount:  number;
  };
  gradeLevelDistribution:  GradeLevelMetric[];
  trackStrandDistribution: TrackStrandMetric[];
  recentAttendanceTrend:   DailyAttendanceMetric[];
  gradePerformance:        GradePerformanceMetric;
  recentSardoRisks:        SARDORiskLearner[];
}

// ── Communication & Announcements ─────────────────────────────────────────────

export type AnnouncementScope = "school_wide" | "jhs" | "shs" | "grade_level" | "section";
export type AnnouncementPriority = "normal" | "urgent" | "advisory";

export interface Announcement {
  id:             string;
  title:          string;
  content:        string;
  authorId:       string;
  authorName:     string;
  authorRole:     Role;
  scope:          AnnouncementScope;
  targetGrade?:   number;
  targetSection?: string;
  sectionName?:   string;
  priority:       AnnouncementPriority;
  isPinned:       boolean;
  createdAt:      string;
  updatedAt:      string;
}

export interface CreateAnnouncementInput {
  title:          string;
  content:        string;
  scope:          AnnouncementScope;
  targetGrade?:   number;
  targetSection?: string;
  priority:       AnnouncementPriority;
  isPinned:       boolean;
}

export interface AnnouncementListResponse {
  data:  Announcement[];
  total: number;
  limit: number;
  skip:  number;
}

export interface AnnouncementFilters {
  scope?:      AnnouncementScope;
  priority?:   AnnouncementPriority;
  gradeLevel?: number;
  sectionId?:  string;
  search?:     string;
  limit?:      number;
  skip?:       number;
}

// ── Class Scheduling & Teacher Subject Loads ──────────────────────────────────

export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";

export interface ScheduleSlot {
  id:          string;
  sectionId:   string;
  sectionName?: string;
  gradeLevel:  number;
  subjectCode: string;
  subjectName: string;
  teacherId:   string;
  teacherName: string;
  dayOfWeek:   DayOfWeek;
  startTime:   string; // "HH:MM"
  endTime:     string; // "HH:MM"
  room?:       string;
  schoolYear:  string;
  semester?:   number;
  createdAt:   string;
  updatedAt:   string;
}

export interface CreateScheduleSlotInput {
  sectionId:   string;
  subjectCode: string;
  subjectName: string;
  teacherId:   string;
  dayOfWeek:   DayOfWeek;
  startTime:   string;
  endTime:     string;
  room?:       string;
  semester?:   number;
}

export interface SectionScheduleResponse {
  sectionId: string;
  slots:     ScheduleSlot[];
  total:     number;
}

export interface TeacherLoadSummary {
  teacherId:   string;
  teacherName: string;
  email:       string;
  totalSlots:  number;
  totalHours:  number;
  slots:       ScheduleSlot[];
}

// ── Dedicated Learner & Parent/Guardian Portal ────────────────────────────────

export interface PortalStudentSummary {
  student:         Student;
  section?:        SectionWithAdviser;
  attendance:      AttendanceSummaryStats;
  grades:          GradeRecord[];
  generalAverage?: number;
  descriptor?:     string;
}

export interface PortalMyResponse {
  user:      User;
  role:      Role;
  learner?:  PortalStudentSummary;
  children?: PortalStudentSummary[];
}

export interface StudentOverviewResponse {
  summary:       PortalStudentSummary;
  schedule:      ScheduleSlot[];
  announcements: Announcement[];
}

// ── Online Admissions & Application Intake ────────────────────────────────────

export type ApplicationStatus = "submitted" | "under_review" | "approved" | "rejected";

export interface AdmissionApplication {
  id:                string;
  applicationNo:     string;
  lrn?:              string;
  hasLrn:            boolean;
  firstName:         string;
  lastName:          string;
  middleName?:       string;
  extName?:          string;
  birthDate:         string;
  birthPlace?:       string;
  sex:               string;
  civilStatus?:      string;
  religion?:         string;
  motherTongue?:     string;
  nationality?:      string;
  contactNo?:        string;
  email?:            string;
  psaBirthCertNo?:   string;
  address:           Address;
  enrollmentType:    EnrollmentType;
  targetGradeLevel:  number;
  strand?:           Strand;
  track?:            string;
  previousSchool?:   string;
  previousSchoolId?: string;
  schoolYear:        string;
  guardian:          Guardian;
  status:            ApplicationStatus;
  reviewRemarks?:    string;
  reviewedBy?:       string;
  reviewedAt?:       string;
  createdStudentId?: string;
  createdAt:         string;
  updatedAt:         string;
}

export interface ApplyAdmissionInput {
  lrn?:              string;
  hasLrn:            boolean;
  firstName:         string;
  lastName:          string;
  middleName?:       string;
  extName?:          string;
  birthDate:         string;
  birthPlace?:       string;
  sex:               string;
  civilStatus?:      string;
  religion?:         string;
  motherTongue?:     string;
  nationality?:      string;
  contactNo?:        string;
  email?:            string;
  psaBirthCertNo?:   string;
  address:           Address;
  enrollmentType?:   EnrollmentType;
  targetGradeLevel:  number;
  strand?:           Strand;
  track?:            string;
  previousSchool?:   string;
  previousSchoolId?: string;
  schoolYear?:       string;
  guardian:          Guardian;
}

export interface AdmissionListResponse {
  data:  AdmissionApplication[];
  total: number;
  limit: number;
  skip:  number;
}

export interface AdmissionFilters {
  status?:     ApplicationStatus;
  gradeLevel?: number;
  schoolYear?: string;
  search?:     string;
  limit?:      number;
  skip?:       number;
}

// ── Messaging & Absence Alerts ───────────────────────────────────────────────

export interface ParticipantSummary {
  id:        string;
  email:     string;
  firstName: string;
  lastName:  string;
  role:      Role;
}

export interface Conversation {
  id:               string;
  participantIds:   string[];
  subject:          string;
  lastMessage:      string;
  lastMessageAt:    string;
  lastSenderId:     string;
  unreadCount:      number;
  schoolId?:        string;
  createdAt:        string;
  updatedAt:        string;
  otherParticipant?: ParticipantSummary;
}

export interface Message {
  id:             string;
  conversationId: string;
  senderId:       string;
  senderName:     string;
  senderRole:     Role;
  recipientId:    string;
  content:        string;
  isRead:         boolean;
  readAt?:        string;
  createdAt:      string;
}

export interface ConversationDetailResponse {
  conversation: Conversation;
  messages:     Message[];
}

export interface StartConversationInput {
  recipientId: string;
  subject?:    string;
  content:     string;
}

export interface SendReplyInput {
  content: string;
}

export interface RecipientOption {
  id:        string;
  email:     string;
  firstName: string;
  lastName:  string;
  role:      Role;
}

export interface AbsenceAlert {
  id:              string;
  attendanceId?:   string;
  studentId:       string;
  studentLrn?:     string;
  lrn?:            string;
  studentName:     string;
  guardianName:    string;
  guardianContact: string;
  date:            string;
  channel:         "sms" | "email" | string;
  message:         string;
  status:          "sent" | "delivered" | "failed" | "queued" | "dispatched" | "simulated" | string;
  providerRef?:    string;
  sentAt?:         string;
  createdAt:       string;
}
