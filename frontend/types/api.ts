/** Mirrors of the backend Pydantic schemas (backend/app/schemas). */

export type Priority = "low" | "normal" | "high";
export type AssignmentStatus = "todo" | "in_progress" | "done";

export type Locale = "fr" | "en";

export type Role = "admin" | "teacher" | "student";
export type ModuleName =
  "grades" | "timetable" | "attendance" | "finance" | "announcements" | "documents";

export interface Institution {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended";
  plan: "essential" | "standard" | "premium";
  modules: ModuleName[];
  country: string | null;
  locale: Locale;
  timezone: string;
  currency: string;
  grade_max: number;
  pass_mark: number;
  compensation: boolean;
  primary_color: string | null;
  logo_url: string | null;
}

/** GET /auth/me: the account, its role in the active institution and that institution. */
export interface User {
  id: string;
  email: string;
  first_name: string;
  locale: Locale;
  timezone: string;
  created_at: string;
  is_superadmin: boolean;
  role: Role | null;
  membership_id: string | null;
  institution: Institution | null;
  memberships: { institution_id: string; institution_name: string; role: Role }[];
}

export interface Profile {
  email: string;
  first_name: string;
  promotion: string | null;
  academic_year: number | null;
  speciality: string | null;
  td_group: string | null;
  tp_group: string | null;
  locale: Locale;
  timezone: string;
}
export type ProfileUpdate = Partial<Omit<Profile, "email">>;

export interface SubjectSummary {
  id: string;
  name: string;
  color: string | null;
}
export interface Subject extends SubjectSummary {
  description: string | null;
  created_at: string;
  updated_at: string;
}
export interface SubjectInput {
  name: string;
  description: string | null;
  color: string | null;
}

export interface Assignment {
  id: string;
  title: string;
  description: string | null;
  subject: SubjectSummary | null;
  due_at: string;
  priority: Priority;
  status: AssignmentStatus;
  created_at: string;
  updated_at: string;
}
export interface AssignmentInput {
  title: string;
  description: string | null;
  subject_id: string | null;
  due_at: string;
  priority: Priority;
  status: AssignmentStatus;
}

export interface Exam {
  id: string;
  title: string;
  subject: SubjectSummary | null;
  exam_at: string;
  room: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}
export interface ExamInput {
  title: string;
  subject_id: string | null;
  exam_at: string;
  room: string | null;
  description: string | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface DashboardSummary {
  upcoming_assignments: Assignment[];
  overdue_assignments: Assignment[];
  upcoming_exams: Exam[];
  counts: {
    todo: number;
    in_progress: number;
    done: number;
    overdue: number;
    due_this_week: number;
    upcoming_exams: number;
    subjects: number;
  };
  /** Assignments due in the current calendar week (Monday-Sunday, Paris). */
  week: { todo: number; in_progress: number; done: number; total: number };
}

/* ---------- Institution (campus) ---------- */

export interface Ref {
  id: string;
  name: string;
}
export interface Department {
  id: string;
  name: string;
  code: string | null;
}
export interface Program {
  id: string;
  name: string;
  code: string | null;
  level: string | null;
  department_id: string | null;
}
export interface AcademicYear {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  is_current: boolean;
}
export interface Period {
  id: string;
  academic_year_id: string;
  name: string;
  position: number;
  starts_on: string;
  ends_on: string;
}
export interface Cohort {
  id: string;
  program_id: string;
  academic_year_id: string;
  name: string;
}
export interface Room {
  id: string;
  name: string;
  building: string | null;
  capacity: number | null;
}
export interface Unit {
  id: string;
  cohort_id: string;
  period_id: string;
  name: string;
  code: string | null;
  credits: number;
}
export interface Course {
  id: string;
  unit_id: string;
  name: string;
  code: string | null;
  coefficient: number;
  teacher_id: string | null;
}
export interface Member {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  role: Role;
  status: "active" | "disabled";
  student_number: string | null;
  cohort_ids: string[];
  created_at: string;
}
export interface Invitation {
  id: string;
  email: string;
  first_name: string | null;
  role: Role;
  cohort_id: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}
export interface InvitationResult {
  email: string;
  status: "invited" | "added" | "error";
  error?: string | null;
  invitation_url: string | null;
}
export interface AuditEntry {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  actor_email: string | null;
  institution_id: string | null;
  created_at: string;
}
export interface SchoolOverview {
  students: number;
  teachers: number;
  admins: number;
  pending_invitations: number;
  cohorts: number;
  courses: number;
  sessions_today: number;
  attendance_rate_30d: number | null;
  billed: number;
  collected: number;
  currency: string;
}
export interface CourseDetail {
  id: string;
  name: string;
  code: string | null;
  coefficient: number;
  unit: Ref;
  unit_credits: number;
  cohort: Ref;
  period: Ref;
  teacher: Ref | null;
  students: number;
}
export interface AssessmentItem {
  id: string;
  course_id: string;
  title: string;
  weight: number;
  max_score: number;
  held_on: string | null;
  published: boolean;
  graded: number;
}
export interface RosterEntry {
  student_id: string;
  first_name: string;
  email: string;
  student_number: string | null;
  score: number | null;
  absent: boolean;
}
export interface CourseResult {
  id: string;
  name: string;
  coefficient: number;
  average: number | null;
  assessments: {
    title: string;
    weight: number;
    max_score: number;
    score: number | null;
    absent: boolean;
  }[];
}
export interface UnitResult {
  id: string;
  code: string | null;
  name: string;
  credits: number;
  average: number | null;
  validated: boolean;
  compensated: boolean;
  courses: CourseResult[];
}
export interface PeriodResult {
  id: string;
  name: string;
  academic_year: string;
  cohort: string;
  average: number | null;
  credits_total: number;
  credits_earned: number;
  validated: boolean;
  units: UnitResult[];
}
export interface StudentResults {
  student_id: string;
  first_name: string;
  student_number: string | null;
  grade_max: number;
  pass_mark: number;
  periods: PeriodResult[];
}
export interface IssuedDocument {
  id: string;
  student_id: string;
  kind: "transcript" | "enrollment_certificate";
  code: string;
  issued_at: string;
  revoked_at: string | null;
  payload: {
    institution: { name: string; country: string | null };
    student: { first_name: string; email: string; student_number: string | null };
    results?: StudentResults;
    enrollments?: {
      cohort: string;
      program: string;
      level: string | null;
      academic_year: string;
    }[];
  };
}
export interface Verification {
  valid: boolean;
  revoked: boolean;
  kind: IssuedDocument["kind"];
  code: string;
  institution: string;
  student_name: string;
  student_number: string | null;
  issued_at: string;
  summary: Record<string, string | number | boolean | null>[];
}
export interface ClassSession {
  id: string;
  starts_at: string;
  ends_at: string;
  kind: string | null;
  course: Ref;
  cohort: Ref;
  room: Ref | null;
  teacher: Ref | null;
}
export type AttendanceStatus = "present" | "absent" | "late" | "excused";
export interface AttendanceEntry {
  student_id: string;
  first_name: string;
  email: string;
  student_number: string | null;
  status: AttendanceStatus | null;
  note: string | null;
}
export interface AttendanceRecord {
  id: string;
  student: Ref;
  course: Ref;
  starts_at: string;
  status: AttendanceStatus;
  note: string | null;
}
export interface MyAttendance {
  recorded: number;
  absent: number;
  late: number;
  excused: number;
  rate: number | null;
  records: AttendanceRecord[];
}
export type PaymentMethod = "cash" | "bank_transfer" | "mobile_money" | "card" | "other";
export interface InvoiceItem {
  id: string;
  student: Ref;
  student_number: string | null;
  label: string;
  amount: number;
  paid: number;
  balance: number;
  due_on: string | null;
  status: "paid" | "partial" | "unpaid" | "overdue";
  currency: string;
  payments: {
    id: string;
    amount: number;
    method: PaymentMethod;
    reference: string | null;
    paid_on: string;
  }[];
  created_at: string;
}
export interface FinanceSummary {
  currency: string;
  billed: number;
  collected: number;
  outstanding: number;
  overdue: number;
  collection_rate: number | null;
  by_method: Partial<Record<PaymentMethod, number>>;
}
export interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  audience: "all" | "students" | "teachers" | "cohort";
  cohort: Ref | null;
  author: string | null;
  created_at: string;
  can_delete: boolean;
}
export interface PlatformInstitution extends Institution {
  members: number;
  students: number;
}
export interface PlatformStats {
  institutions: number;
  active_institutions: number;
  suspended_institutions: number;
  users: number;
  students: number;
  teachers: number;
  by_plan: Record<string, number>;
}
export interface PlatformUser {
  id: string;
  email: string;
  first_name: string;
  is_superadmin: boolean;
  is_active: boolean;
  institutions: string[];
}
