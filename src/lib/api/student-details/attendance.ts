// Kojobot — Student attendance
import { supabase } from "@/integrations/supabase/client";

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
