// Kojobot — Student details React Query hooks
import { useQuery } from "@tanstack/react-query";
import {
  getStudentAttendance,
  getStudentEnrollments,
  getStudentInstallments,
  getStudentParents,
  getStudentProfile,
  getStudentProgress,
  type StudentProfile,
} from "@/lib/api/student-details";

export const studentDetailsKeys = {
  profile: (id: string) => ["student", id, "profile"] as const,
  parents: (id: string) => ["student", id, "parents"] as const,
  enrollments: (id: string) => ["student", id, "enrollments"] as const,
  attendance: (id: string) => ["student", id, "attendance"] as const,
  payments: (id: string) => ["student", id, "payments"] as const,
  progress: (id: string) => ["student", id, "progress"] as const,
};

export function useStudentProfile(id: string) {
  return useQuery({
    queryKey: studentDetailsKeys.profile(id),
    queryFn: () => getStudentProfile(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useStudentParents(id: string) {
  return useQuery({
    queryKey: studentDetailsKeys.parents(id),
    queryFn: () => getStudentParents(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useStudentEnrollments(id: string, enabled: boolean) {
  return useQuery({
    queryKey: studentDetailsKeys.enrollments(id),
    queryFn: () => getStudentEnrollments(id),
    enabled: !!id && enabled,
    staleTime: 60_000,
  });
}

export function useStudentAttendance(id: string, enabled: boolean) {
  return useQuery({
    queryKey: studentDetailsKeys.attendance(id),
    queryFn: () => getStudentAttendance(id),
    enabled: !!id && enabled,
    staleTime: 30_000,
  });
}

export function useStudentPayments(id: string, enabled: boolean) {
  return useQuery({
    queryKey: studentDetailsKeys.payments(id),
    queryFn: () => getStudentInstallments(id),
    enabled: !!id && enabled,
    staleTime: 30_000,
  });
}

export function useStudentProgress(
  id: string,
  profile: StudentProfile | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [
      ...studentDetailsKeys.progress(id),
      profile?.current_level?.id ?? null,
      profile?.current_group?.id ?? null,
    ],
    queryFn: () =>
      getStudentProgress(
        id,
        profile?.current_level
          ? {
              id: profile.current_level.id,
              passing_score: profile.current_level.passing_score,
              classwork_weight: profile.current_level.classwork_weight,
              exam_weight: profile.current_level.exam_weight,
            }
          : null,
        profile?.current_group?.id ?? null,
      ),
    enabled: !!id && enabled && !!profile,
    staleTime: 30_000,
  });
}
