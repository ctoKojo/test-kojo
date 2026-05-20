// Kojobot — Session details + attendance data layer
import { supabase } from "@/integrations/supabase/client";

export interface SessionDetail {
  id: string;
  branch_id: string;
  group_id: string;
  session_number: number;
  scheduled_at_utc: string;
  scheduled_end_at_utc: string;
  status: string;
  close_reason: string | null;
  group: { id: string; name: string } | null;
  trainer: { id: string; full_name: string | null } | null;
  room: { id: string; name: string } | null;
  level: { id: string; name: string } | null;
}

export interface SessionRosterRow {
  student_id: string;
  full_name: string | null;
  avatar_url: string | null;
  attendance_id: string | null;
  status: "present" | "absent" | "excused" | "late";
  notes: string | null;
  is_locked: boolean;
}

export async function getSessionDetail(
  sessionId: string,
): Promise<SessionDetail> {
  const { data, error } = await supabase
    .from("group_sessions")
    .select(
      `
      id, branch_id, group_id, session_number, scheduled_at_utc,
      scheduled_end_at_utc, status, close_reason,
      group:groups!group_id ( id, name ),
      trainer:profiles!trainer_id ( id, full_name ),
      room:rooms!room_id ( id, name ),
      level:levels!level_id ( id, name )
    `,
    )
    .eq("id", sessionId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Session not found");
  return data as unknown as SessionDetail;
}

export async function getSessionRoster(
  sessionId: string,
  groupId: string,
): Promise<SessionRosterRow[]> {
  const [enrollRes, attRes] = await Promise.all([
    supabase
      .from("group_enrollments")
      .select(
        `
        student:students!student_id (
          id,
          profile:profiles!profile_id ( full_name, avatar_url )
        )
      `,
      )
      .eq("group_id", groupId)
      .eq("status", "active"),
    supabase
      .from("attendance_records")
      .select("id, student_id, status, notes, is_locked")
      .eq("session_id", sessionId),
  ]);
  if (enrollRes.error) throw enrollRes.error;
  if (attRes.error) throw attRes.error;

  const attMap = new Map(
    (attRes.data ?? []).map((a) => [a.student_id, a]),
  );

  return (enrollRes.data ?? [])
    .map((row) => {
      const s = row.student as unknown as {
        id: string;
        profile: { full_name: string | null; avatar_url: string | null } | null;
      } | null;
      if (!s) return null;
      const att = attMap.get(s.id);
      return {
        student_id: s.id,
        full_name: s.profile?.full_name ?? null,
        avatar_url: s.profile?.avatar_url ?? null,
        attendance_id: att?.id ?? null,
        status: (att?.status ?? "absent") as SessionRosterRow["status"],
        notes: att?.notes ?? null,
        is_locked: att?.is_locked ?? false,
      };
    })
    .filter((x): x is SessionRosterRow => x !== null)
    .sort((a, b) =>
      (a.full_name ?? "").localeCompare(b.full_name ?? ""),
    );
}

export interface AttendanceMarkInput {
  session_id: string;
  group_id: string;
  branch_id: string;
  student_id: string;
  status: "present" | "absent" | "excused" | "late";
  notes?: string | null;
}

export async function markAttendance(input: AttendanceMarkInput): Promise<void> {
  const { data: existing, error: selErr } = await supabase
    .from("attendance_records")
    .select("id, is_locked")
    .eq("session_id", input.session_id)
    .eq("student_id", input.student_id)
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing?.is_locked) {
    throw new Error("Attendance record is locked");
  }

  const userRes = await supabase.auth.getUser();
  const uid = userRes.data.user?.id ?? null;

  if (existing) {
    const { error } = await supabase
      .from("attendance_records")
      .update({
        status: input.status,
        notes: input.notes ?? null,
        marked_at: new Date().toISOString(),
        marked_by: uid,
      })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("attendance_records").insert({
      session_id: input.session_id,
      group_id: input.group_id,
      branch_id: input.branch_id,
      student_id: input.student_id,
      status: input.status,
      notes: input.notes ?? null,
      marked_at: new Date().toISOString(),
      marked_by: uid,
    });
    if (error) throw error;
  }
}
