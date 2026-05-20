// Kojobot — Installments table
import { Wallet } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { KojoBadge } from "@/components/ui/kojo/kojo-badge";
import { KojoButton } from "@/components/ui/kojo/kojo-button";
import type {
  InstallmentRow,
  InstallmentStatus,
} from "@/lib/api/finance";

interface Props {
  rows: InstallmentRow[] | undefined;
  isLoading: boolean;
  showBranch: boolean;
  canRecord: boolean;
  onRecord: (row: InstallmentRow) => void;
}

function variantOf(
  s: InstallmentStatus,
): "success" | "warning" | "danger" | "info" | "neutral" {
  switch (s) {
    case "paid":
      return "success";
    case "overdue":
      return "danger";
    case "pending":
      return "info";
    case "waived":
      return "warning";
    case "cancelled":
      return "neutral";
    default:
      return "neutral";
  }
}

function isOverdue(row: InstallmentRow): boolean {
  if (row.status === "paid" || row.status === "cancelled") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(row.due_date) < today;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtMoney(n: number | null | undefined) {
  return Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function InstallmentsTable({
  rows,
  isLoading,
  showBranch,
  canRecord,
  onRecord,
}: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
        <Wallet
          className="mx-auto size-10 text-muted-foreground/60"
          strokeWidth={1.25}
        />
        <h3 className="mt-3 font-main text-base font-semibold text-foreground">
          No installments match these filters
        </h3>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border">
            <TableHead>Student</TableHead>
            <TableHead className="w-[130px]">Due</TableHead>
            <TableHead className="w-[110px] text-right">Amount</TableHead>
            <TableHead className="w-[110px] text-right">Paid</TableHead>
            {showBranch && <TableHead>Branch</TableHead>}
            <TableHead className="w-[110px]">Status</TableHead>
            {canRecord && <TableHead className="w-[120px]" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const overdue = isOverdue(r);
            return (
              <TableRow
                key={r.id}
                className="border-border hover:bg-kojo-cyan/5 transition-colors"
              >
                <TableCell className="text-sm text-foreground font-medium">
                  {r.student ? (
                    <Link
                      to="/students/$studentId"
                      params={{ studentId: r.student.id }}
                      className="hover:text-kojo-cyan"
                    >
                      {r.student.profile?.full_name ?? "Unnamed"}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell
                  className={
                    overdue
                      ? "text-sm text-destructive font-medium"
                      : "text-sm text-muted-foreground"
                  }
                >
                  {fmtDate(r.due_date)}
                </TableCell>
                <TableCell className="text-sm text-foreground text-right">
                  {fmtMoney(r.amount)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground text-right">
                  {r.paid_amount != null ? fmtMoney(r.paid_amount) : "—"}
                </TableCell>
                {showBranch && (
                  <TableCell className="text-sm text-muted-foreground">
                    {r.branch?.name ?? "—"}
                  </TableCell>
                )}
                <TableCell>
                  <KojoBadge
                    variant={overdue && r.status === "pending" ? "danger" : variantOf(r.status)}
                  >
                    {overdue && r.status === "pending" ? "overdue" : r.status}
                  </KojoBadge>
                </TableCell>
                {canRecord && (
                  <TableCell className="text-right">
                    {r.status !== "paid" && r.status !== "cancelled" ? (
                      <KojoButton
                        variant="secondary"
                        size="sm"
                        onClick={() => onRecord(r)}
                      >
                        Record
                      </KojoButton>
                    ) : null}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
