// Kojobot — Finance (installments) list route
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useInstallmentsList } from "@/hooks/queries/useFinance";
import {
  InstallmentsFilters,
  type InstallmentsFiltersValue,
} from "@/components/features/finance/InstallmentsFilters";
import { InstallmentsTable } from "@/components/features/finance/InstallmentsTable";
import { FinanceSummaryCards } from "@/components/features/finance/FinanceSummaryCards";
import { RecordPaymentDialog } from "@/components/features/finance/RecordPaymentDialog";
import { GroupsPagination } from "@/components/features/groups/GroupsPagination";
import type { InstallmentRow } from "@/lib/api/finance";

export const Route = createFileRoute("/_authenticated/finance/")({
  component: FinancePage,
});

const PAGE_SIZE = 20;

function FinancePage() {
  const { hasRole, hasAnyRole } = useAuth();
  const isSuperAdmin = hasRole("super_admin");
  const canRecord = hasAnyRole(["super_admin", "branch_admin", "reception"]);

  const [filters, setFilters] = useState<InstallmentsFiltersValue>({
    filter: "due_today",
    status: null,
    branchId: null,
  });
  const [page, setPage] = useState(0);
  const [recording, setRecording] = useState<InstallmentRow | null>(null);

  const { data, isLoading, isFetching } = useInstallmentsList({
    filter: filters.filter,
    status: filters.status,
    branchId: filters.branchId,
    page,
    pageSize: PAGE_SIZE,
  });

  const update = (next: InstallmentsFiltersValue) => {
    setFilters(next);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-title text-2xl text-foreground">Finance</h1>
        <p className="text-sm text-muted-foreground">
          Track installments, record payments, and monitor cash flow.
        </p>
      </div>

      <FinanceSummaryCards branchId={filters.branchId} />

      <InstallmentsFilters
        value={filters}
        onChange={update}
        isSuperAdmin={isSuperAdmin}
      />

      <InstallmentsTable
        rows={data?.rows}
        isLoading={isLoading || isFetching}
        showBranch={isSuperAdmin}
        canRecord={canRecord}
        onRecord={setRecording}
      />

      <GroupsPagination
        page={page}
        pageSize={PAGE_SIZE}
        total={data?.total ?? 0}
        onPageChange={setPage}
      />

      <RecordPaymentDialog
        installment={recording}
        onClose={() => setRecording(null)}
      />
    </div>
  );
}
