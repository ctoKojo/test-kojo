// Kojobot — Student details data layer
// All read queries for a single student profile page.
// Components MUST go through hooks/queries/useStudentDetails.ts → this file.

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type SubscriptionStatus =
  Database["public"]["Enums"]["subscription_status"];
type EnrollmentStatus = Database["public"]["Enums"]["enrollment_status"];
type InstallmentStatus = Database["public"]["Enums"]["installment_status"];

// ─────────────────────────────────────────────────────────────────────
// Profile (overview header + parents)
// ─────────────────────────────────────────────────────────────────────

export interface StudentParent {
  link_id: string;
  parent_id: string;
  is_primary: boolean;
  relation_type: string;
  profile: {
    id: string;
    full_name: string | null;
    phone: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

export interface StudentProfile {
  id: string;
  branch_id: string;
  birthdate: string | null;
  gender: string | null;
  school: string | null;
  notes: string | null;
  subscription_status: SubscriptionStatus;
  created_at: string;
  profile: {
    id: string;
    full_name: string | null;
    phone: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  branch: { id: string; name: string } | null;
  current_group: { id: string; name: string } | null;
  current_level: {
    id: string;
    name: string;
    passing_score: number;
    classwork_weight: number;
    exam_weight: number;
  } | null;
  age_group: { id: string; name: string } | null;
}

export async function getStudentProfile(
  studentId: string,
): Promise<StudentProfile> {
  const { data, error } = await supabase
    .from("students")
    .select(
      `
      id, branch_id, birthdate, gender, school, notes,
      subscription_status, created_at,
      profile:profiles!profile_id ( id, full_name, phone, email, avatar_url ),
      branch:branches!branch_id ( id, name ),
      current_group:groups!current_group_id ( id, name ),
      current_level:levels!current_level_id (
        id, name, passing_score, classwork_weight, exam_weight
      ),
      age_group:age_groups!age_group_id ( id, name )
    `,
    )
    .eq("id", studentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Student not found");
  return data as unknown as StudentProfile;
}

export async function getStudentParents(
  studentId: string,
): Promise<StudentParent[]> {
  const { data, error } = await supabase
    .from("parent_student_links")
    .select(
      `
      id, is_primary, parent_id,
      parent:parents!parent_id (
        relation_type,
        profile:profiles!profile_id ( id, full_name, phone, email, avatar_url )
      )
    `,
    )
    .eq("student_id", studentId)
    .order("is_primary", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => {
    const parent = (row.parent ?? {}) as {
      relation_type?: string;
      profile?: StudentParent["profile"];
    };
    return {
      link_id: row.id,
      parent_id: row.parent_id,
      is_primary: row.is_primary,
      relation_type: parent.relation_type ?? "parent",
      profile: parent.profile ?? null,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────
// Enrollments history
// ─────────────────────────────────────────────────────────────────────

export interface StudentEnrollment {
  id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at: string | null;
  dropped_at: string | null;
  drop_reason: string | null;
  billing_type: string;
  group: {
    id: string;
    name: string;
    status: string;
    starts_on: string | null;
    level: { id: string; name: string } | null;
  } | null;
}

export async function getStudentEnrollments(
  studentId: string,
): Promise<StudentEnrollment[]> {
  const { data, error } = await supabase
    .from("group_enrollments")
    .select(
      `
      id, status, enrolled_at, completed_at, dropped_at, drop_reason, billing_type,
      group:groups!group_id (
        id, name, status, starts_on,
        level:levels!level_id ( id, name )
      )
    `,
    )
    .eq("student_id", studentId)
    .order("enrolled_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as StudentEnrollment[];
}

// ─────────────────────────────────────────────────────────────────────
// Attendance
// ─────────────────────────────────────────────────────────────────────

export interface StudentAttendanceRow {
  id: string;
  status: string;
  notes: string | null;
  session: {
    id: string;
    session_number: number;
    scheduled_at_utc: string;
    status: string;
    group: { id: string; name: string } | null;
  } | null;
}

export interface StudentAttendanceSummary {
  total: number;
  present: number;
  absent: number;
  excused: number;
  late: number;
  percentage: number;
}

export interface StudentAttendanceResult {
  rows: StudentAttendanceRow[];
  summary: StudentAttendanceSummary;
}

export async function getStudentAttendance(
  studentId: string,
  limit = 50,
): Promise<StudentAttendanceResult> {
  const { data, error } = await supabase
    .from("attendance_records")
    .select(
      `
      id, status, notes,
      session:group_sessions!session_id (
        id, session_number, scheduled_at_utc, status,
        group:groups!group_id ( id, name )
      )
    `,
    )
    .eq("student_id", studentId)
    .limit(limit);

  if (error) throw error;
  const rows = ((data ?? []) as unknown as StudentAttendanceRow[]).sort(
    (a, b) => {
      const da = a.session?.scheduled_at_utc
        ? new Date(a.session.scheduled_at_utc).getTime()
        : 0;
      const db = b.session?.scheduled_at_utc
        ? new Date(b.session.scheduled_at_utc).getTime()
        : 0;
      return db - da;
    },
  );

  const summary: StudentAttendanceSummary = {
    total: rows.length,
    present: 0,
    absent: 0,
    excused: 0,
    late: 0,
    percentage: 0,
  };
  for (const r of rows) {
    if (r.status === "present") summary.present++;
    else if (r.status === "absent") summary.absent++;
    else if (r.status === "excused") summary.excused++;
    else if (r.status === "late") summary.late++;
  }
  const counted = summary.present + summary.late;
  summary.percentage =
    summary.total > 0 ? Math.round((counted / summary.total) * 100) : 0;

  return { rows, summary };
}

// ─────────────────────────────────────────────────────────────────────
// Installments / payments
// ─────────────────────────────────────────────────────────────────────

export interface StudentInstallment {
  id: string;
  amount: number;
  paid_amount: number | null;
  due_date: string;
  status: InstallmentStatus;
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
}

export interface StudentPaymentsSummary {
  totalDue: number;
  totalPaid: number;
  outstanding: number;
  overdueCount: number;
}

export interface StudentPaymentsResult {
  rows: StudentInstallment[];
  summary: StudentPaymentsSummary;
}

export async function getStudentInstallments(
  studentId: string,
): Promise<StudentPaymentsResult> {
  const { data, error } = await supabase
    .from("installments")
    .select(
      `id, amount, paid_amount, due_date, status, paid_at, payment_method, notes`,
    )
    .eq("student_id", studentId)
    .order("due_date", { ascending: false });

  if (error) throw error;
  const rows = (data ?? []) as unknown as StudentInstallment[];

  const today = new Date().toISOString().slice(0, 10);
  const summary: StudentPaymentsSummary = {
    totalDue: 0,
    totalPaid: 0,
    outstanding: 0,
    overdueCount: 0,
  };
  for (const r of rows) {
    summary.totalDue += Number(r.amount) || 0;
    summary.totalPaid += Number(r.paid_amount) || 0;
    if (r.status !== "paid" && r.due_date < today) summary.overdueCount++;
  }
  summary.outstanding = Math.max(summary.totalDue - summary.totalPaid, 0);
  return { rows, summary };
}

// ─────────────────────────────────────────────────────────────────────
// Progress: assignment grades + exam grades + progression log
// ─────────────────────────────────────────────────────────────────────

export interface StudentAssignmentGrade {
  id: string;
  status: string;
  score: number | null;
  submitted_at: string | null;
  graded_at: string | null;
  feedback: string | null;
  assignment: {
    id: string;
    title: string;
    max_score: number;
    due_date: string;
    is_compensation: boolean;
    group: { id: string; name: string } | null;
  } | null;
}

export interface StudentExamGrade {
  id: string;
  score: number | null;
  passed: boolean | null;
  graded_at: string | null;
  failure_reason_type: string | null;
  notes: string | null;
  exam: {
    id: string;
    title: string;
    exam_date: string;
    max_score: number;
    passing_score: number;
    group: { id: string; name: string } | null;
  } | null;
}

export interface StudentProgressionLogRow {
  id: string;
  progression_type: string;
  failure_reason_type: string | null;
  decided_at: string;
  notes: string | null;
  from_level: { id: string; name: string } | null;
  to_level: { id: string; name: string } | null;
  academic_term: { id: string; name: string; code: string } | null;
}

export interface StudentLevelProgress {
  /** Weighted score for the CURRENT level (classwork + exam). null when no data yet. */
  weightedScore: number | null;
  classworkAvg: number | null;
  examScore: number | null;
  passingScore: number;
  classworkWeight: number;
  examWeight: number;
  status: "on_track" | "at_risk" | "passing" | "no_data";
}

export interface StudentProgressResult {
  assignments: StudentAssignmentGrade[];
  exams: StudentExamGrade[];
  progressionLog: StudentProgressionLogRow[];
  currentLevel: StudentLevelProgress | null;
}

export async function getStudentProgress(
  studentId: string,
  currentLevelMeta: {
    id: string;
    passing_score: number;
    classwork_weight: number;
    exam_weight: number;
  } | null,
  currentGroupId: string | null,
): Promise<StudentProgressResult> {
  // Run all three queries in parallel.
  const [submissionsRes, examsRes, progressionRes] = await Promise.all([
    supabase
      .from("assignment_submissions")
      .select(
        `
        id, status, score, submitted_at, graded_at, feedback,
        assignment:assignments!assignment_id (
          id, title, max_score, due_date, is_compensation,
          group:groups!group_id ( id, name )
        )
      `,
      )
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("final_exam_results")
      .select(
        `
        id, score, passed, graded_at, failure_reason_type, notes,
        exam:final_exams!exam_id (
          id, title, exam_date, max_score, passing_score,
          group:groups!group_id ( id, name )
        )
      `,
      )
      .eq("student_id", studentId)
      .order("graded_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("student_progression_log")
      .select(
        `
        id, progression_type, failure_reason_type, decided_at, notes,
        from_level:levels!from_level_id ( id, name ),
        to_level:levels!to_level_id ( id, name ),
        academic_term:academic_terms!academic_term_id ( id, name, code )
      `,
      )
      .eq("student_id", studentId)
      .order("decided_at", { ascending: false }),
  ]);

  if (submissionsRes.error) throw submissionsRes.error;
  if (examsRes.error) throw examsRes.error;
  if (progressionRes.error) throw progressionRes.error;

  const assignments =
    (submissionsRes.data ?? []) as unknown as StudentAssignmentGrade[];
  const exams = (examsRes.data ?? []) as unknown as StudentExamGrade[];
  const progressionLog =
    (progressionRes.data ?? []) as unknown as StudentProgressionLogRow[];

  // Compute current level progress from grades belonging to the current group.
  let currentLevel: StudentLevelProgress | null = null;
  if (currentLevelMeta) {
    const passing = Number(currentLevelMeta.passing_score) || 60;
    const cwWeight = Number(currentLevelMeta.classwork_weight) || 60;
    const exWeight = Number(currentLevelMeta.exam_weight) || 40;

    // Classwork avg: graded submissions for the current group only.
    const classworkSubs = assignments.filter(
      (a) =>
        a.score !== null &&
        a.assignment &&
        (currentGroupId
          ? a.assignment.group?.id === currentGroupId
          : true) &&
        a.assignment.max_score > 0,
    );
    let classworkAvg: number | null = null;
    if (classworkSubs.length > 0) {
      const pctSum = classworkSubs.reduce(
        (sum, a) =>
          sum + ((a.score ?? 0) / (a.assignment?.max_score || 100)) * 100,
        0,
      );
      classworkAvg = pctSum / classworkSubs.length;
    }

    // Exam score: latest graded exam for the current group.
    const examForGroup = exams.find(
      (e) =>
        e.score !== null &&
        e.exam &&
        (currentGroupId ? e.exam.group?.id === currentGroupId : true),
    );
    const examPct =
      examForGroup && examForGroup.exam && examForGroup.exam.max_score > 0
        ? ((examForGroup.score ?? 0) / examForGroup.exam.max_score) * 100
        : null;

    let weightedScore: number | null = null;
    if (classworkAvg !== null && examPct !== null) {
      weightedScore = (classworkAvg * cwWeight + examPct * exWeight) / 100;
    } else if (classworkAvg !== null) {
      weightedScore = classworkAvg;
    } else if (examPct !== null) {
      weightedScore = examPct;
    }

    let status: StudentLevelProgress["status"] = "no_data";
    if (weightedScore !== null) {
      if (weightedScore >= passing) status = "passing";
      else if (weightedScore >= passing - 10) status = "on_track";
      else status = "at_risk";
    }

    currentLevel = {
      weightedScore,
      classworkAvg,
      examScore: examPct,
      passingScore: passing,
      classworkWeight: cwWeight,
      examWeight: exWeight,
      status,
    };
  }

  return { assignments, exams, progressionLog, currentLevel };
}
