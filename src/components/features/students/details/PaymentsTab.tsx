// Kojobot — Payments tab (installments + balance summary)
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KojoBadge } from "@/components/ui/kojo/kojo-badge";
import { KojoCard } from "@/components/ui/kojo/kojo-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { StudentPaymentsResult } from "@/lib/api/student-details";

interface Props {
  data: StudentPaymentsResult | undefined;
  isLoading: boolean;
}

function statusVariant(
  s: string,
  due: string,
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (s === "paid") return "success";
  if (s === "partial") return "warning";
  if (s === "waived") return "info";
  if (s === "cancelled") return "neutral";
  // pending / overdue
  const today = new Date().toISOString().slice(0, 10);
  return due < today ? "danger" : "info";
}

function money(n: number) {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function PaymentsTab({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }
  if (!data || data.rows.length === 0) {
    return (
      <KojoCard>
        <p className="py-10 text-center text-sm text-muted-foreground">
          No installments yet.
        </p>
      </KojoCard>
    );
  }

  const { rows, summary } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total Due" value={money(summary.totalDue)} accent="cyan" />
        <Stat label="Total Paid" value={money(summary.totalPaid)} accent="success" />
        <Stat
          label="Outstanding"
          value={money(summary.outstanding)}
          accent={summary.outstanding > 0 ? "warning" : "success"}
        />
        <Stat
          label="Overdue"
          value={String(summary.overdueCount)}
          accent={summary.overdueCount > 0 ? "danger" : "cyan"}
        />
      </div>

      <KojoCard className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Due Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Paid At</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-foreground">
                  {format(new Date(r.due_date), "dd MMM yyyy")}
                </TableCell>
                <TableCell className="text-foreground">
                  {money(Number(r.amount))}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {r.paid_amount != null ? money(Number(r.paid_amount)) : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {r.payment_method ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {r.paid_at ? format(new Date(r.paid_at), "dd MMM yyyy") : "—"}
                </TableCell>
                <TableCell>
                  <KojoBadge variant={statusVariant(r.status, r.due_date)}>
                    {r.status}
                  </KojoBadge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </KojoCard>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "cyan" | "success" | "warning" | "danger";
}) {
  const color = {
    cyan: "text-kojo-cyan",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
  }[accent];
  const cardAccent = accent === "success" ? "success" : accent;
  return (
    <KojoCard variant="stat" accent={cardAccent}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 font-title text-xl ${color}`}>{value}</div>
    </KojoCard>
  );
}
