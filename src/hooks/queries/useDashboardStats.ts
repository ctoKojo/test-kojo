// Kojobot — Dashboard stats React Query hook
import { useQuery } from "@tanstack/react-query";
import { fetchDashboardStats } from "@/lib/api/kpis";

export const dashboardKeys = {
  stats: ["dashboard", "stats"] as const,
};

export function useDashboardStats(enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.stats,
    queryFn: fetchDashboardStats,
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
