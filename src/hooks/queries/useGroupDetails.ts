// Kojobot — Group details React Query hooks
import { useQuery } from "@tanstack/react-query";
import {
  getGroupProfile,
  getGroupRoster,
  getGroupSessions,
} from "@/lib/api/group-details";

export const groupDetailsKeys = {
  profile: (id: string) => ["group", id, "profile"] as const,
  roster: (id: string) => ["group", id, "roster"] as const,
  sessions: (id: string) => ["group", id, "sessions"] as const,
};

export function useGroupProfile(id: string) {
  return useQuery({
    queryKey: groupDetailsKeys.profile(id),
    queryFn: () => getGroupProfile(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useGroupRoster(id: string, enabled: boolean) {
  return useQuery({
    queryKey: groupDetailsKeys.roster(id),
    queryFn: () => getGroupRoster(id),
    enabled: !!id && enabled,
    staleTime: 30_000,
  });
}

export function useGroupSessions(id: string, enabled: boolean) {
  return useQuery({
    queryKey: groupDetailsKeys.sessions(id),
    queryFn: () => getGroupSessions(id),
    enabled: !!id && enabled,
    staleTime: 30_000,
  });
}
