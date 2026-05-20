// Kojobot — Reports overview
// Branch-aware analytics summary built on existing KPI counts.

import { createFileRoute } from "@tanstack/react-router";
import {
  TrendingUp,
  Users,
  Wallet,
  Calendar,
  Layers,
  BarChart2,
} from "lucide-react";
import { KojoCard } from "@/components/ui/kojo/kojo-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStats } from "@/hooks/queries/useDashboardStats";
import { useAuth } from "@/lib/auth/useAuth";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { roles, isLoading: authLoading } = useAuth();
  const { data: stats, isLoading } = useDashboardStats(!authLoading);

  const scope = roles.includes("super_admin") ? "All branches" : "Your branch";

  const blocks = [
    {
      label: "Active Students",
      value: stats?.totalStudents,
      icon: Users,
      accent: "cyan" as const,
      hint: "Currently enrolled students",
    },
    {
      label: "Active Groups",
      value: stats?.activeGroups,
      icon: Layers,
      accent: "violet" as const,
      hint: "Groups running this term",
    },
    {
      label: "Sessions Today",
      value: stats?.todaySessions,
      icon: Calendar,
      accent: "success" as const,
      hint: "Scheduled for today",
    },
    {
      label: "Open Installments",
      value: stats?.pendingPayments,
      icon: Wallet,
      accent: "warning" as const,
      hint: "Pending or overdue",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-title text-2xl text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Operational summary — {scope.toLowerCase()}.
          </p>
        </div>
        <span className="rounded-full border border-kojo-cyan/30 bg-kojo-cyan/10 px-3 py-1 text-xs font-medium text-kojo-cyan">
          <TrendingUp className="mr-1 inline size-3" strokeWidth={2} />
          Live data
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {blocks.map((b) => {
          const Icon = b.icon;
          const showSkeleton = isLoading || b.value === undefined;
          return (
            <KojoCard key={b.label} variant="stat" accent={b.accent}>
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    {b.label}
                  </p>
                  {showSkeleton ? (
                    <Skeleton className="mt-2 h-9 w-16" />
                  ) : (
                    <p className="mt-2 font-title text-3xl text-foreground">
                      {b.value}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">{b.hint}</p>
                </div>
                <Icon
                  className="size-5 text-muted-foreground shrink-0"
                  strokeWidth={1.5}
                />
              </div>
            </KojoCard>
          );
        })}
      </div>

      <KojoCard>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-kojo-violet/10 text-kojo-violet">
            <BarChart2 className="size-5" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-main text-lg font-semibold text-foreground">
              Detailed reports coming soon
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Attendance trends, financial forecasts, and trainer performance
              dashboards roll out in the next phase.
            </p>
          </div>
        </div>
      </KojoCard>
    </div>
  );
}
