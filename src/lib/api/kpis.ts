// Kojobot — Dashboard KPI counts
// Real-time stat cards for the dashboard home page.

import { supabase } from "@/integrations/supabase/client";

export interface DashboardStats {
  totalStudents: number;
  activeGroups: number;
  todaySessions: number;
  pendingPayments: number;
}

function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { start, end } = getTodayRange();

  // Run all counts in parallel
  const [studentsQ, groupsQ, sessionsQ, paymentsQ] = await Promise.all([
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),

    supabase
      .from("groups")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .is("deleted_at", null),

    supabase
      .from("group_sessions")
      .select("id", { count: "exact", head: true })
      .gte("scheduled_at_utc", start)
      .lt("scheduled_at_utc", end)
      .neq("status", "cancelled"),

    supabase
      .from("installments")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "overdue"]),
  ]);

  if (studentsQ.error) throw studentsQ.error;
  if (groupsQ.error) throw groupsQ.error;
  if (sessionsQ.error) throw sessionsQ.error;
  if (paymentsQ.error) throw paymentsQ.error;

  return {
    totalStudents: studentsQ.count ?? 0,
    activeGroups: groupsQ.count ?? 0,
    todaySessions: sessionsQ.count ?? 0,
    pendingPayments: paymentsQ.count ?? 0,
  };
}
