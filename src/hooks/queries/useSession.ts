// Kojobot — Session hooks
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSessionDetail,
  getSessionRoster,
  markAttendance,
  type AttendanceMarkInput,
} from "@/lib/api/sessions";

export function useSessionDetail(sessionId: string) {
  return useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => getSessionDetail(sessionId),
    enabled: !!sessionId,
  });
}

export function useSessionRoster(
  sessionId: string,
  groupId: string | undefined,
) {
  return useQuery({
    queryKey: ["session-roster", sessionId],
    queryFn: () => getSessionRoster(sessionId, groupId!),
    enabled: !!sessionId && !!groupId,
  });
}

export function useMarkAttendance(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AttendanceMarkInput) => markAttendance(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["session-roster", sessionId] });
    },
  });
}
