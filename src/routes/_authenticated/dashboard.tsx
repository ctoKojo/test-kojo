// Kojobot — Dashboard home (mock stats per Phase 1 plan)
import { createFileRoute } from "@tanstack/react-router";
import { Users, Layers, Video, Wallet } from "lucide-react";
import { KojoCard } from "@/components/ui/kojo/kojo-card";
import { useAuth } from "@/lib/auth/useAuth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const STATS = [
  { label: "Total Students", value: "—", icon: Users, accent: "cyan" as const },
  { label: "Active Groups", value: "—", icon: Layers, accent: "violet" as const },
  { label: "Today Sessions", value: "—", icon: Video, accent: "success" as const },
  { label: "Pending Payments", value: "—", icon: Wallet, accent: "warning" as const },
];

function DashboardPage() {
  const { user, roles, isLoading } = useAuth();

  const subtitle = isLoading
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
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <KojoCard key={stat.label} variant="stat" accent={stat.accent}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    {stat.label}
                  </p>
                  <p className="mt-2 font-title text-3xl font-bold text-foreground">
                    {stat.value}
                  </p>
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
