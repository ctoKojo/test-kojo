// Kojobot — Groups list page
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGroupsList } from "@/hooks/queries/useGroups";
import { useAuth } from "@/lib/auth/useAuth";
import {
  GroupsFilters,
  type GroupsFiltersValue,
} from "@/components/features/groups/GroupsFilters";
import { GroupsTable } from "@/components/features/groups/GroupsTable";
import { GroupsPagination } from "@/components/features/groups/GroupsPagination";
import { AddGroupDialog } from "@/components/features/groups/AddGroupDialog";

export const Route = createFileRoute("/_authenticated/groups/")({
  component: GroupsPage,
});

const PAGE_SIZE = 25;

function GroupsPage() {
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole("super_admin");
  const canCreate = hasRole("super_admin") || hasRole("branch_admin") || hasRole("reception");
  const [addOpen, setAddOpen] = useState(false);

  const [filters, setFilters] = useState<GroupsFiltersValue>({
    search: "",
    status: null,
    branchId: null,
    levelId: null,
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search.trim()), 300);
    return () => clearTimeout(t);
  }, [filters.search]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, filters.status, filters.branchId, filters.levelId]);

  const queryParams = useMemo(
    () => ({
      search: debouncedSearch,
      status: filters.status,
      branchId: filters.branchId,
      levelId: filters.levelId,
      page,
      pageSize: PAGE_SIZE,
    }),
    [debouncedSearch, filters.status, filters.branchId, filters.levelId, page],
  );

  const { data, isLoading, isFetching, refetch, error } =
    useGroupsList(queryParams);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-main text-2xl font-bold text-foreground">
            Groups
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage class groups, trainers, and capacity.
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
            disabled={!canCreate}
            title={canCreate ? "Create new group" : "You don't have permission"}
            onClick={() => setAddOpen(true)}
          >
            <Plus className="mr-2 size-4" strokeWidth={1.5} />
            Add group
          </Button>
        </div>
      </div>

      <GroupsFilters
        value={filters}
        onChange={setFilters}
        isSuperAdmin={isSuperAdmin}
      />

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load groups: {(error as Error).message}
        </div>
      )}

      <GroupsTable
        items={data?.items ?? []}
        isLoading={isLoading}
        isFetching={isFetching}
        showBranch={isSuperAdmin}
      />

      {data && data.total > 0 && (
        <GroupsPagination
          page={page}
          pageSize={PAGE_SIZE}
          total={data.total}
          onPageChange={setPage}
        />
      )}

      <AddGroupDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
