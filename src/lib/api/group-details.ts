// Kojobot — Group details data layer
import { supabase } from "@/integrations/supabase/client";

export interface GroupProfile {
  id: string;
  name: string;
  status: string;
  starts_on: string | null;
  max_students: number | null;
  package_tier: string | null;
  subscription_type: string | null;
  online_link: string | null;
  schedule_meta: unknown;
  branch: { id: string; name: string } | null;
  level: { id: string; name: string } | null;
  trainer: {
    id: string;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null;
  room: { id: string; name: string } | null;
  term: { id: string; name: string } | null;
  enrolled_count: number;
}

export interface RosterRow {
  enrollment_id: string;
  status: string;
  enrolled_at: string;
  student: {
    id: string;
    profile: {
      full_name: string | null;
      phone: string | null;
      avatar_url: string | null;
    } | null;
  } | null;
}

export interface SessionRow {
  id: string;
  session_number: number;
  scheduled_at_utc: string;
  scheduled_end_at_utc: string | null;
  status: string;
  close_reason: string | null;
  trainer: { id: string; full_name: string | null } | null;
  room: { id: string; name: string } | null;
}

export async function getGroupProfile(id: string): Promise<GroupProfile> {
  const { data, error } = await supabase
    .from("groups")
    .select(
      `
      id, name, status, starts_on, max_students, package_tier,
      subscription_type, online_link, schedule_meta,
      branch:branches!branch_id ( id, name ),
      level:levels!level_id ( id, name ),
      trainer:profiles!trainer_id ( id, full_name, phone, avatar_url ),
      room:rooms!room_id ( id, name ),
      term:academic_terms!term_id ( id, name ),
      enrollments:group_enrollments ( id, status )
    `,
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Group not found");
  const enrollments = (data as unknown as {
    enrollments: Array<{ status: string }> | null;
  }).enrollments ?? [];
  return {
    ...(data as unknown as Omit<GroupProfile, "enrolled_count">),
    enrolled_count: enrollments.filter((e) => e.status === "active").length,
  };
}

export async function getGroupRoster(id: string): Promise<RosterRow[]> {
  const { data, error } = await supabase
    .from("group_enrollments")
    .select(
      `
      id, status, enrolled_at,
      student:students!student_id (
        id,
        profile:profiles!profile_id ( full_name, phone, avatar_url )
      )
    `,
    )
    .eq("group_id", id)
    .order("enrolled_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as Array<{
    id: string;
    status: string;
    enrolled_at: string;
    student: RosterRow["student"];
  }>).map((r) => ({
    enrollment_id: r.id,
    status: r.status,
    enrolled_at: r.enrolled_at,
    student: r.student,
  }));
}

export async function getGroupSessions(id: string): Promise<SessionRow[]> {
  const { data, error } = await supabase
    .from("group_sessions")
    .select(
      `
      id, session_number, scheduled_at_utc, scheduled_end_at_utc, status, close_reason,
      trainer:profiles!trainer_id ( id, full_name ),
      room:rooms!room_id ( id, name )
    `,
    )
    .eq("group_id", id)
    .is("deleted_at", null)
    .order("scheduled_at_utc", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as SessionRow[];
}
