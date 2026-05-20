// Kojobot — Sessions list route
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useSessionsList } from "@/hooks/queries/useSessionsList";
import {
  SessionsFilters,
  type SessionsFiltersValue,
} from "@/components/features/sessions/SessionsFilters";
import { SessionsTable } from "@/components/features/sessions/SessionsTable";
import { GroupsPagination } from "@/components/features/groups/GroupsPagination";

export const Route = createFileRoute("/_authenticated/sessions/")({
  component: SessionsListPage,
});

const PAGE_SIZE = 20;

function SessionsListPage() {
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole("super_admin");

  const [filters, setFilters] = useState<SessionsFiltersValue>({
    filter: "today",
    status: null,
    branchId: null,
  });
  const [page, setPage] = useState(0);

  const { data, isLoading, isFetching } = useSessionsList({
    filter: filters.filter,
    status: filters.status,
    branchId: filters.branchId,
    page,
    pageSize: PAGE_SIZE,
  });

  const update = (next: SessionsFiltersValue) => {
    setFilters(next);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-title text-2xl text-foreground">Sessions</h1>
        <p className="text-sm text-muted-foreground">
          Browse and manage class sessions across all groups.
        </p>
      </div>

      <SessionsFilters
        value={filters}
        onChange={update}
        isSuperAdmin={isSuperAdmin}
      />

      <SessionsTable
        rows={data?.rows}
        isLoading={isLoading || isFetching}
        showBranch={isSuperAdmin}
      />

      <GroupsPagination
        page={page}
        pageSize={PAGE_SIZE}
        total={data?.total ?? 0}
        onPageChange={setPage}
      />
    </div>
  );
}
