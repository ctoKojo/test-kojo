// Kojobot — Sessions list data layer
import { supabase } from "@/integrations/supabase/client";

export type SessionListFilter = "today" | "upcoming" | "past" | "all";

export interface SessionListRow {
  id: string;
  session_number: number;
  scheduled_at_utc: string;
  scheduled_end_at_utc: string;
  status: string;
  group: { id: string; name: string } | null;
  trainer: { id: string; full_name: string | null } | null;
  room: { id: string; name: string } | null;
  branch: { id: string; name: string } | null;
}

export interface ListSessionsParams {
  filter: SessionListFilter;
  branchId?: string | null;
  status?: string | null;
  trainerId?: string | null;
  page: number;
  pageSize: number;
}

export interface ListSessionsResult {
  rows: SessionListRow[];
  total: number;
}

const SELECT = `
  id, session_number, scheduled_at_utc, scheduled_end_at_utc, status,
  group:groups!group_id ( id, name ),
  trainer:profiles!trainer_id ( id, full_name ),
  room:rooms!room_id ( id, name ),
  branch:branches!branch_id ( id, name )
`;

function dayBoundsUtc(): { startIso: string; endIso: string } {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export async function listSessions(
  params: ListSessionsParams,
): Promise<ListSessionsResult> {
  const { filter, branchId, status, trainerId, page, pageSize } = params;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("group_sessions")
    .select(SELECT, { count: "exact" })
    .is("deleted_at", null);

  const nowIso = new Date().toISOString();
  if (filter === "today") {
    const { startIso, endIso } = dayBoundsUtc();
    q = q.gte("scheduled_at_utc", startIso).lte("scheduled_at_utc", endIso);
  } else if (filter === "upcoming") {
    q = q.gte("scheduled_at_utc", nowIso);
  } else if (filter === "past") {
    q = q.lt("scheduled_at_utc", nowIso);
  }

  if (branchId) q = q.eq("branch_id", branchId);
  if (status) q = q.eq("status", status as never);
  if (trainerId) q = q.eq("trainer_id", trainerId);

  q = q
    .order("scheduled_at_utc", { ascending: filter !== "past" })
    .range(from, to);

  const { data, error, count } = await q;
  if (error) throw error;
  return {
    rows: (data ?? []) as unknown as SessionListRow[],
    total: count ?? 0,
  };
}
