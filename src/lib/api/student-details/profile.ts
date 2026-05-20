// Kojobot — Student profile + parents
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];

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
