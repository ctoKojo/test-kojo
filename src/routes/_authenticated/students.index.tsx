// Kojobot — Students list page
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudentsList } from "@/hooks/queries/useStudents";
import { useAuth } from "@/lib/auth/useAuth";
import { StudentsFilters, type StudentsFiltersValue } from "@/components/features/students/StudentsFilters";
import { StudentsTable } from "@/components/features/students/StudentsTable";
import { StudentsPagination } from "@/components/features/students/StudentsPagination";

export const Route = createFileRoute("/_authenticated/students/")({
  component: StudentsPage,
});

const PAGE_SIZE = 25;

function StudentsPage() {
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole("super_admin");

  const [filters, setFilters] = useState<StudentsFiltersValue>({
    search: "",
    status: null,
    branchId: null,
    ageGroupId: null,
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search.trim()), 300);
    return () => clearTimeout(t);
  }, [filters.search]);

  // Reset to page 0 when filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, filters.status, filters.branchId, filters.ageGroupId]);

  const queryParams = useMemo(
    () => ({
      search: debouncedSearch,
      status: filters.status,
      branchId: filters.branchId,
      ageGroupId: filters.ageGroupId,
      page,
      pageSize: PAGE_SIZE,
    }),
    [debouncedSearch, filters.status, filters.branchId, filters.ageGroupId, page],
  );

  const { data, isLoading, isFetching, refetch, error } =
    useStudentsList(queryParams);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-main text-2xl font-bold text-foreground">
            Students
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage student profiles, enrollments, and progress.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`mr-2 size-4 ${isFetching ? "animate-spin" : ""}`}
              strokeWidth={1.5}
            />
            Refresh
          </Button>
          <Button
            size="sm"
            className="bg-kojo-gradient text-white border-transparent hover:opacity-90"
            disabled
            title="Coming soon"
          >
            <Plus className="mr-2 size-4" strokeWidth={1.5} />
            Add student
          </Button>
        </div>
      </div>

      {/* Filters */}
      <StudentsFilters
        value={filters}
        onChange={setFilters}
        isSuperAdmin={isSuperAdmin}
      />

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load students: {(error as Error).message}
        </div>
      )}

      {/* Table */}
      <StudentsTable
        items={data?.items ?? []}
        isLoading={isLoading}
        isFetching={isFetching}
        showBranch={isSuperAdmin}
      />

      {/* Pagination */}
      {data && data.total > 0 && (
        <StudentsPagination
          page={page}
          pageSize={PAGE_SIZE}
          total={data.total}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
