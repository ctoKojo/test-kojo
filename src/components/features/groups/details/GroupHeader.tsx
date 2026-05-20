// Kojobot — Group detail header
import { Layers, Building2, User2, MapPin, Calendar, Users2 } from "lucide-react";
import { KojoBadge } from "@/components/ui/kojo/kojo-badge";
import { KojoCard } from "@/components/ui/kojo/kojo-card";
import type { GroupProfile } from "@/lib/api/group-details";

function statusVariant(
  s: string,
): "success" | "warning" | "danger" | "info" | "neutral" {
  switch (s) {
    case "active":
      return "success";
    case "pending":
      return "warning";
    case "completed":
      return "info";
    case "cancelled":
      return "danger";
    default:
      return "neutral";
  }
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface Props {
  group: GroupProfile;
  showBranch: boolean;
}

export function GroupHeader({ group, showBranch }: Props) {
  const cap = group.max_students ?? 0;
  return (
    <KojoCard>
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        <div className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-kojo-gradient text-white shadow-kojo-gradient">
          <Layers className="size-10" strokeWidth={1.5} />
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-title text-2xl text-foreground">{group.name}</h1>
            <KojoBadge variant={statusVariant(group.status)}>
              {group.status}
            </KojoBadge>
            {group.subscription_type && (
              <span className="text-xs text-muted-foreground capitalize">
                {group.subscription_type}
                {group.package_tier ? ` · ${group.package_tier}` : ""}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-muted-foreground md:grid-cols-4">
            <Meta icon={<Layers className="size-4" strokeWidth={1.5} />}>
              {group.level?.name ?? "No level"}
            </Meta>
            <Meta icon={<User2 className="size-4" strokeWidth={1.5} />}>
              {group.trainer?.full_name ?? "Unassigned"}
            </Meta>
            {showBranch && (
              <Meta icon={<Building2 className="size-4" strokeWidth={1.5} />}>
                {group.branch?.name ?? "—"}
              </Meta>
            )}
            <Meta icon={<MapPin className="size-4" strokeWidth={1.5} />}>
              {group.room?.name ?? "—"}
            </Meta>
            <Meta icon={<Calendar className="size-4" strokeWidth={1.5} />}>
              {fmtDate(group.starts_on)}
            </Meta>
            <Meta icon={<Users2 className="size-4" strokeWidth={1.5} />}>
              {group.enrolled_count} / {cap || "∞"} students
            </Meta>
          </div>
        </div>
      </div>
    </KojoCard>
  );
}

function Meta({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-kojo-cyan">{icon}</span>
      <span className="truncate">{children}</span>
    </div>
  );
}
