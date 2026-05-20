// Kojobot — Student enrollments history
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type EnrollmentStatus = Database["public"]["Enums"]["enrollment_status"];

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
