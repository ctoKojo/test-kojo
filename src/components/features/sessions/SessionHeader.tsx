// Kojobot — Session header
import { Calendar, Clock, MapPin, User2, Layers } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { KojoBadge } from "@/components/ui/kojo/kojo-badge";
import { KojoCard } from "@/components/ui/kojo/kojo-card";
import type { SessionDetail } from "@/lib/api/sessions";

function statusVariant(
  s: string,
): "success" | "warning" | "danger" | "info" | "neutral" {
  switch (s) {
    case "closed":
      return "success";
    case "open":
      return "info";
    case "cancelled":
      return "danger";
    case "missed":
      return "warning";
    default:
      return "neutral";
  }
}

function fmt(d: string): string {
  return new Date(d).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SessionHeader({ session }: { session: SessionDetail }) {
  return (
    <KojoCard variant="default" className="p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <KojoBadge variant={statusVariant(session.status)}>
              {session.status}
            </KojoBadge>
            <span className="font-title text-xs uppercase tracking-wider text-muted-foreground">
              Session #{session.session_number}
            </span>
          </div>
          {session.group && (
            <Link
              to="/groups/$groupId"
              params={{ groupId: session.group.id }}
              className="inline-block font-title text-2xl text-foreground hover:text-kojo-cyan transition-colors"
            >
              {session.group.name}
            </Link>
          )}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
            {session.level && (
              <span className="inline-flex items-center gap-1.5">
                <Layers className="size-4 text-kojo-cyan" />
                {session.level.name}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <User2 className="size-4 text-kojo-cyan" />
              {session.trainer?.full_name ?? "Unassigned"}
            </span>
            {session.room && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4 text-kojo-cyan" />
                {session.room.name}
              </span>
            )}
          </div>
        </div>
        <div className="space-y-1 text-right text-sm">
          <div className="inline-flex items-center gap-1.5 text-foreground">
            <Calendar className="size-4 text-kojo-violet" />
            {fmt(session.scheduled_at_utc)}
          </div>
          <div className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Clock className="size-4 text-kojo-violet" />
            until {fmt(session.scheduled_end_at_utc)}
          </div>
        </div>
      </div>
    </KojoCard>
  );
}
