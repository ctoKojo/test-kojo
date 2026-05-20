// Kojobot — Finance (installments) data layer
import { supabase } from "@/integrations/supabase/client";

export type InstallmentFilter =
  | "due_today"
  | "overdue"
  | "upcoming"
  | "paid"
  | "all";

export type InstallmentStatus =
  | "pending"
  | "paid"
  | "overdue"
  | "waived"
  | "cancelled";

export interface InstallmentRow {
  id: string;
  amount: number;
  paid_amount: number | null;
  due_date: string;
  paid_at: string | null;
  status: InstallmentStatus;
  payment_method: string | null;
  student: {
    id: string;
    profile: { id: string; full_name: string | null } | null;
  } | null;
  branch: { id: string; name: string } | null;
}

export interface ListInstallmentsParams {
  filter: InstallmentFilter;
  status?: InstallmentStatus | null;
  branchId?: string | null;
  page: number;
  pageSize: number;
}

export interface ListInstallmentsResult {
  rows: InstallmentRow[];
  total: number;
}

const SELECT = `
  id, amount, paid_amount, due_date, paid_at, status, payment_method,
  student:students!student_id (
    id,
    profile:profiles!profile_id ( id, full_name )
  ),
  branch:branches!branch_id ( id, name )
`;

function todayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export async function listInstallments(
  params: ListInstallmentsParams,
): Promise<ListInstallmentsResult> {
  const { filter, status, branchId, page, pageSize } = params;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("installments")
    .select(SELECT, { count: "exact" });

  const today = todayIso();
  if (filter === "due_today") {
    q = q.eq("due_date", today).neq("status", "paid");
  } else if (filter === "overdue") {
    q = q.lt("due_date", today).in("status", ["pending", "overdue"]);
  } else if (filter === "upcoming") {
    q = q.gt("due_date", today).eq("status", "pending");
  } else if (filter === "paid") {
    q = q.eq("status", "paid");
  }

  if (status) q = q.eq("status", status);
  if (branchId) q = q.eq("branch_id", branchId);

  q = q
    .order("due_date", { ascending: filter !== "paid" })
    .range(from, to);

  const { data, error, count } = await q;
  if (error) throw error;
  return {
    rows: (data ?? []) as unknown as InstallmentRow[],
    total: count ?? 0,
  };
}

export interface RecordPaymentInput {
  installmentId: string;
  paidAmount: number;
  paymentMethod: "cash" | "bank_transfer" | "wallet" | "card";
  notes?: string | null;
}

export async function recordInstallmentPayment(input: RecordPaymentInput) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("installments")
    .update({
      status: "paid",
      paid_amount: input.paidAmount,
      payment_method: input.paymentMethod,
      paid_at: new Date().toISOString(),
      received_by: user.id,
      notes: input.notes ?? null,
    })
    .eq("id", input.installmentId);

  if (error) throw error;
}

export interface FinanceSummary {
  dueTodayCount: number;
  dueTodayAmount: number;
  overdueCount: number;
  overdueAmount: number;
  paidThisMonthAmount: number;
}

export async function getFinanceSummary(
  branchId?: string | null,
): Promise<FinanceSummary> {
  const today = todayIso();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartIso = monthStart.toISOString();

  const apply = <T>(q: T): T => {
    if (branchId) return (q as { eq: (c: string, v: string) => T }).eq("branch_id", branchId);
    return q;
  };

  const [due, overdue, paid] = await Promise.all([
    apply(
      supabase
        .from("installments")
        .select("amount", { count: "exact" })
        .eq("due_date", today)
        .neq("status", "paid"),
    ),
    apply(
      supabase
        .from("installments")
        .select("amount", { count: "exact" })
        .lt("due_date", today)
        .in("status", ["pending", "overdue"]),
    ),
    apply(
      supabase
        .from("installments")
        .select("paid_amount")
        .eq("status", "paid")
        .gte("paid_at", monthStartIso),
    ),
  ]);

  const sum = (
    rows: { amount?: number | null; paid_amount?: number | null }[] | null,
    key: "amount" | "paid_amount",
  ) => (rows ?? []).reduce((acc, r) => acc + Number(r[key] ?? 0), 0);

  return {
    dueTodayCount: due.count ?? 0,
    dueTodayAmount: sum(due.data as never, "amount"),
    overdueCount: overdue.count ?? 0,
    overdueAmount: sum(overdue.data as never, "amount"),
    paidThisMonthAmount: sum(paid.data as never, "paid_amount"),
  };
}
