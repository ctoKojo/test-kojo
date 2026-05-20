// Kojobot — Finance summary stat cards
import { Wallet, AlertCircle, CheckCircle2 } from "lucide-react";
import { KojoCard } from "@/components/ui/kojo/kojo-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFinanceSummary } from "@/hooks/queries/useFinance";

interface Props {
  branchId: string | null;
}

function fmt(n: number) {
  return n.toLocaleString();
}

export function FinanceSummaryCards({ branchId }: Props) {
  const { data, isLoading } = useFinanceSummary(branchId);

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <KojoCard variant="stat" accent="cyan" className="flex items-start gap-3 p-5">
        <Wallet className="size-6 text-kojo-cyan" strokeWidth={1.5} />
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Due Today
          </p>
          <p className="font-title text-2xl text-foreground">
            {fmt(data.dueTodayAmount)}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.dueTodayCount} installment{data.dueTodayCount === 1 ? "" : "s"}
          </p>
        </div>
      </KojoCard>

      <KojoCard variant="stat" accent="danger" className="flex items-start gap-3 p-5">
        <AlertCircle className="size-6 text-destructive" strokeWidth={1.5} />
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Overdue
          </p>
          <p className="font-title text-2xl text-foreground">
            {fmt(data.overdueAmount)}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.overdueCount} installment{data.overdueCount === 1 ? "" : "s"}
          </p>
        </div>
      </KojoCard>

      <KojoCard variant="stat" accent="success" className="flex items-start gap-3 p-5">
        <CheckCircle2 className="size-6 text-success" strokeWidth={1.5} />
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Paid This Month
          </p>
          <p className="font-title text-2xl text-foreground">
            {fmt(data.paidThisMonthAmount)}
          </p>
          <p className="text-xs text-muted-foreground">running total</p>
        </div>
      </KojoCard>
    </div>
  );
}
