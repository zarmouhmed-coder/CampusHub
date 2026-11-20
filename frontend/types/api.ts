/** Mirrors of the backend Pydantic schemas (backend/app/schemas). */

export type Priority = "low" | "normal" | "high";
export type AssignmentStatus = "todo" | "in_progress" | "done";

export interface User {
  id: string;
  email: string;
  first_name: string;
  created_at: string;
}

export interface Profile {
  email: string;
  first_name: string;
  promotion: string | null;
  academic_year: number | null;
  speciality: string | null;
  td_group: string | null;
  tp_group: string | null;
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
