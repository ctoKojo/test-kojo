// Kojobot — Student installments / payments
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type InstallmentStatus = Database["public"]["Enums"]["installment_status"];

export interface StudentInstallment {
  id: string;
  amount: number;
  paid_amount: number | null;
  due_date: string;
  status: InstallmentStatus;
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
}

export interface StudentPaymentsSummary {
  totalDue: number;
  totalPaid: number;
  outstanding: number;
  overdueCount: number;
}

export interface StudentPaymentsResult {
  rows: StudentInstallment[];
  summary: StudentPaymentsSummary;
}

export async function getStudentInstallments(
  studentId: string,
): Promise<StudentPaymentsResult> {
  const { data, error } = await supabase
    .from("installments")
    .select(
      `id, amount, paid_amount, due_date, status, paid_at, payment_method, notes`,
    )
    .eq("student_id", studentId)
    .order("due_date", { ascending: false });

  if (error) throw error;
  const rows = (data ?? []) as unknown as StudentInstallment[];

  const today = new Date().toISOString().slice(0, 10);
  const summary: StudentPaymentsSummary = {
    totalDue: 0,
    totalPaid: 0,
    outstanding: 0,
    overdueCount: 0,
  };
  for (const r of rows) {
    summary.totalDue += Number(r.amount) || 0;
    summary.totalPaid += Number(r.paid_amount) || 0;
    if (r.status !== "paid" && r.due_date < today) summary.overdueCount++;
  }
  summary.outstanding = Math.max(summary.totalDue - summary.totalPaid, 0);
  return { rows, summary };
}
