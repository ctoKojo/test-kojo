// Kojobot — Students React Query hooks
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  listAgeGroupsForFilter,
  listBranchesForFilter,
  listStudents,
  type ListStudentsParams,
} from "@/lib/api/students";

export const studentsKeys = {
  all: ["students"] as const,
  list: (params: ListStudentsParams) =>
    ["students", "list", params] as const,
  branches: ["students", "filters", "branches"] as const,
  ageGroups: ["students", "filters", "age-groups"] as const,
};

export function useStudentsList(params: ListStudentsParams) {
  return useQuery({
    queryKey: studentsKeys.list(params),
    queryFn: () => listStudents(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useBranchesFilter(enabled = true) {
  return useQuery({
    queryKey: studentsKeys.branches,
    queryFn: listBranchesForFilter,
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useAgeGroupsFilter() {
  return useQuery({
    queryKey: studentsKeys.ageGroups,
    queryFn: listAgeGroupsForFilter,
    staleTime: 10 * 60_000,
  });
}
