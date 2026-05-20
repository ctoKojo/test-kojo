// Kojobot — Student progress (assignments + exams + progression log)
import { supabase } from "@/integrations/supabase/client";

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

  let currentLevel: StudentLevelProgress | null = null;
  if (currentLevelMeta) {
    const passing = Number(currentLevelMeta.passing_score) || 60;
    const cwWeight = Number(currentLevelMeta.classwork_weight) || 60;
    const exWeight = Number(currentLevelMeta.exam_weight) || 40;

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
