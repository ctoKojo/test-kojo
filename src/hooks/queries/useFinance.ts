// Kojobot — Finance React Query hooks
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getFinanceSummary,
  listInstallments,
  recordInstallmentPayment,
  type ListInstallmentsParams,
  type RecordPaymentInput,
} from "@/lib/api/finance";

export const financeKeys = {
  all: ["finance"] as const,
  list: (params: ListInstallmentsParams) =>
    ["finance", "installments", params] as const,
  summary: (branchId?: string | null) =>
    ["finance", "summary", branchId ?? "all"] as const,
};

export function useInstallmentsList(params: ListInstallmentsParams) {
  return useQuery({
    queryKey: financeKeys.list(params),
    queryFn: () => listInstallments(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useFinanceSummary(branchId?: string | null) {
  return useQuery({
    queryKey: financeKeys.summary(branchId),
    queryFn: () => getFinanceSummary(branchId),
    staleTime: 60_000,
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordPaymentInput) => recordInstallmentPayment(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: financeKeys.all });
    },
  });
}
