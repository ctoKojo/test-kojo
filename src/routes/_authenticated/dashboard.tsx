// Kojobot — Dashboard home with real KPI stats
import { createFileRoute } from "@tanstack/react-router";
import { Users, Layers, Video, Wallet } from "lucide-react";
import { KojoCard } from "@/components/ui/kojo/kojo-card";
import { useAuth } from "@/lib/auth/useAuth";
import { useDashboardStats } from "@/hooks/queries/useDashboardStats";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const STAT_CONFIG = [
  { label: "Total Students", key: "totalStudents" as const, icon: Users, accent: "cyan" as const },
  { label: "Active Groups", key: "activeGroups" as const, icon: Layers, accent: "violet" as const },
  { label: "Today Sessions", key: "todaySessions" as const, icon: Video, accent: "success" as const },
  { label: "Pending Payments", key: "pendingPayments" as const, icon: Wallet, accent: "warning" as const },
];

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function DashboardPage() {
  const { user, roles, isLoading: authLoading } = useAuth();
  const { data: stats, isLoading: statsLoading } = useDashboardStats(!authLoading);

  const subtitle = authLoading
    ? "Loading roles…"
    : roles.length > 0
      ? `Signed in as ${roles.join(", ").replace(/_/g, " ")}`
      : "No roles assigned — contact your administrator";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-main text-2xl font-bold text-foreground">
          Welcome{user?.email ? `, ${user.email.split("@")[0]}` : ""}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CONFIG.map((stat) => {
          const Icon = stat.icon;
          const value = stats?.[stat.key];
          const isLoading = statsLoading || value === undefined;

          return (
            <KojoCard key={stat.label} variant="stat" accent={stat.accent}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    {stat.label}
                  </p>
                  {isLoading ? (
                    <Skeleton className="mt-2 h-9 w-16" />
                  ) : (
                    <p className="mt-2 font-title text-3xl text-foreground">
                      {formatCount(value)}
                    </p>
                  )}
                </div>
                <Icon className="size-5 text-muted-foreground" strokeWidth={1.5} />
              </div>
            </KojoCard>
          );
        })}
      </div>

      <KojoCard>
        <h3 className="font-main text-lg font-semibold text-foreground">
          Phase 1 — Foundation ready
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Design system tokens, auth flow, and dashboard shell are wired. Real data
          and feature pages roll out in Phase 2.
        </p>
      </KojoCard>
    </div>
  );
}
