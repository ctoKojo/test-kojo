// Kojobot — Students data layer
// Single source of truth for `students` table queries.
// Components MUST go through hooks/queries/useStudents.ts → this file.
// No direct supabase.from('students') outside this module.

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type SubscriptionStatus =
  Database["public"]["Enums"]["subscription_status"];

export interface StudentListItem {
  id: string;
  branch_id: string;
  birthdate: string | null;
  gender: string | null;
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
  current_level: { id: string; name: string } | null;
  age_group: { id: string; name: string } | null;
}

export interface ListStudentsParams {
  search?: string;
  branchId?: string | null;
  status?: SubscriptionStatus | null;
  ageGroupId?: string | null;
  page?: number;
  pageSize?: number;
}

export interface ListStudentsResult {
  items: StudentListItem[];
  total: number;
  page: number;
  pageSize: number;
}

const SELECT = `
  id, branch_id, birthdate, gender, subscription_status, created_at,
  profile:profiles!profile_id ( id, full_name, phone, email, avatar_url ),
  branch:branches!branch_id ( id, name ),
  current_group:groups!current_group_id ( id, name ),
  current_level:levels!current_level_id ( id, name ),
  age_group:age_groups!age_group_id ( id, name )
` as const;

export async function listStudents(
  params: ListStudentsParams = {},
): Promise<ListStudentsResult> {
  const {
    search,
    branchId,
    status,
    ageGroupId,
    page = 0,
    pageSize = 25,
  } = params;

  let query = supabase
    .from("students")
    .select(SELECT, { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (branchId) query = query.eq("branch_id", branchId);
  if (status) query = query.eq("subscription_status", status);
  if (ageGroupId) query = query.eq("age_group_id", ageGroupId);

  // Search: name / phone / email on embedded profile.
  // PostgREST `or` with embedded path is OK for ilike filters.
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(
      `full_name.ilike.${term},phone.ilike.${term},email.ilike.${term}`,
      { referencedTable: "profiles" },
    );
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    items: (data ?? []) as unknown as StudentListItem[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

/** List active branches for the Branch filter dropdown (super_admin). */
export async function listBranchesForFilter(): Promise<
  Array<{ id: string; name: string }>
> {
  const { data, error } = await supabase
    .from("branches")
    .select("id, name")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

/** Age groups for filter dropdown. */
export async function listAgeGroupsForFilter(): Promise<
  Array<{ id: string; name: string }>
> {
  const { data, error } = await supabase
    .from("age_groups")
    .select("id, name")
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  "pending_payment",
  "active_waiting",
  "active",
  "paused",
  "frozen",
  "restricted",
  "expired",
  "cancelled",
];

/** Calculate age (in full years) from a birthdate string. */
export function calculateAge(birthdate: string | null): number | null {
  if (!birthdate) return null;
  const dob = new Date(birthdate);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}
