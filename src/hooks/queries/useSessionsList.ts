// Kojobot — Sessions list hook
import { useQuery } from "@tanstack/react-query";
import { listSessions, type ListSessionsParams } from "@/lib/api/sessions-list";

export function useSessionsList(params: ListSessionsParams) {
  return useQuery({
    queryKey: ["sessions-list", params],
    queryFn: () => listSessions(params),
  });
}
