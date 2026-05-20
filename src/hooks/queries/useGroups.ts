// Kojobot — Groups React Query hooks
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  listGroups,
  listLevelsForFilter,
  type ListGroupsParams,
} from "@/lib/api/groups";

export const groupsKeys = {
  all: ["groups"] as const,
  list: (params: ListGroupsParams) => ["groups", "list", params] as const,
  levels: ["groups", "filters", "levels"] as const,
};

export function useGroupsList(params: ListGroupsParams) {
  return useQuery({
    queryKey: groupsKeys.list(params),
    queryFn: () => listGroups(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useLevelsFilter() {
  return useQuery({
    queryKey: groupsKeys.levels,
    queryFn: listLevelsForFilter,
    staleTime: 10 * 60_000,
  });
}
