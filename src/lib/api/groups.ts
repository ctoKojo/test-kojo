// Kojobot — Groups data layer
// Single source of truth for `groups` table queries.
// Components MUST go through hooks/queries/useGroups.ts → this file.

import { supabase } from "@/integrations/supabase/client";

export type GroupStatus = "active" | "pending" | "completed" | "cancelled";

export interface GroupListItem {
  id: string;
  name: string;
  status: string;
  starts_on: string | null;
  max_students: number | null;
  package_tier: string | null;
  subscription_type: string | null;
  branch: { id: string; name: string } | null;
  level: { id: string; name: string } | null;
  trainer: { id: string; full_name: string | null } | null;
  room: { id: string; name: string } | null;
  enrolled_count: number;
}

export interface ListGroupsParams {
  search?: string;
  branchId?: string | null;
  levelId?: string | null;
  status?: string | null;
  page?: number;
  pageSize?: number;
}

export interface ListGroupsResult {
  items: GroupListItem[];
  total: number;
  page: number;
  pageSize: number;
}

const SELECT = `
  id, name, status, starts_on, max_students, package_tier, subscription_type,
  branch:branches!branch_id ( id, name ),
  level:levels!level_id ( id, name ),
  trainer:profiles!trainer_id ( id, full_name ),
  room:rooms!room_id ( id, name ),
  enrollments:group_enrollments ( id, status )
` as const;

interface RawGroupRow {
  id: string;
  name: string;
  status: string;
  starts_on: string | null;
  max_students: number | null;
  package_tier: string | null;
  subscription_type: string | null;
  branch: { id: string; name: string } | null;
  level: { id: string; name: string } | null;
  trainer: { id: string; full_name: string | null } | null;
  room: { id: string; name: string } | null;
  enrollments: Array<{ id: string; status: string }> | null;
}

export async function listGroups(
  params: ListGroupsParams = {},
): Promise<ListGroupsResult> {
  const {
    search,
    branchId,
    levelId,
    status,
    page = 0,
    pageSize = 25,
  } = params;

  let query = supabase
    .from("groups")
    .select(SELECT, { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (branchId) query = query.eq("branch_id", branchId);
  if (levelId) query = query.eq("level_id", levelId);
  if (status) query = query.eq("status", status);
  if (search && search.trim()) {
    query = query.ilike("name", `%${search.trim()}%`);
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  const items: GroupListItem[] = ((data ?? []) as unknown as RawGroupRow[]).map(
    (r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      starts_on: r.starts_on,
      max_students: r.max_students,
      package_tier: r.package_tier,
      subscription_type: r.subscription_type,
      branch: r.branch,
      level: r.level,
      trainer: r.trainer,
      room: r.room,
      enrolled_count: (r.enrollments ?? []).filter(
        (e) => e.status === "active",
      ).length,
    }),
  );

  return {
    items,
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function listLevelsForFilter(): Promise<
  Array<{ id: string; name: string }>
> {
  const { data, error } = await supabase
    .from("levels")
    .select("id, name")
    .order("sort_order", { nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export const GROUP_STATUSES = [
  "pending",
  "active",
  "completed",
  "cancelled",
] as const;
