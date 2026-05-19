// Kojobot — Student detail header (avatar + name + status + meta)
import { User as UserIcon, Calendar, Building2, Layers, Users2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { KojoBadge } from "@/components/ui/kojo/kojo-badge";
import { KojoCard } from "@/components/ui/kojo/kojo-card";
import {
  calculateAge,
  type SubscriptionStatus,
} from "@/lib/api/students";
import type { StudentProfile } from "@/lib/api/student-details";

function statusVariant(
  s: SubscriptionStatus,
): "success" | "warning" | "danger" | "info" | "neutral" {
  switch (s) {
    case "active":
      return "success";
    case "active_waiting":
    case "pending_payment":
      return "info";
    case "paused":
    case "frozen":
      return "warning";
    case "restricted":
    case "expired":
    case "cancelled":
      return "danger";
    default:
      return "neutral";
  }
}

interface Props {
  student: StudentProfile;
  showBranch: boolean;
}

export function StudentHeader({ student, showBranch }: Props) {
  const age = calculateAge(student.birthdate);
  const name = student.profile?.full_name ?? "Unnamed student";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <KojoCard>
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        <Avatar className="size-20 border border-border">
          {student.profile?.avatar_url ? (
            <AvatarImage src={student.profile.avatar_url} alt={name} />
          ) : null}
          <AvatarFallback className="bg-muted text-lg font-semibold">
            {initials || <UserIcon className="size-8" strokeWidth={1.5} />}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-title text-2xl text-foreground">{name}</h1>
            <KojoBadge variant={statusVariant(student.subscription_status)}>
              {student.subscription_status.replace(/_/g, " ")}
            </KojoBadge>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-muted-foreground md:grid-cols-4">
            {age !== null ? (
              <Meta icon={<Calendar className="size-4" strokeWidth={1.5} />}>
                {age} years
                {student.age_group ? ` · ${student.age_group.name}` : ""}
              </Meta>
            ) : null}
            {showBranch && student.branch ? (
              <Meta icon={<Building2 className="size-4" strokeWidth={1.5} />}>
                {student.branch.name}
              </Meta>
            ) : null}
            <Meta icon={<Layers className="size-4" strokeWidth={1.5} />}>
              {student.current_level?.name ?? "No level"}
            </Meta>
            <Meta icon={<Users2 className="size-4" strokeWidth={1.5} />}>
              {student.current_group?.name ?? "No group"}
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
