// Kojobot — Attendance marker (roster + per-student status toggle)
import { useState } from "react";
import { Check, X, Clock, FileText, Loader2, User2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useMarkAttendance } from "@/hooks/queries/useSession";
import type { SessionRosterRow } from "@/lib/api/sessions";

type Status = SessionRosterRow["status"];

const STATUSES: { value: Status; label: string; icon: typeof Check; cls: string }[] = [
  { value: "present", label: "Present", icon: Check, cls: "data-[active=true]:bg-success/15 data-[active=true]:text-success data-[active=true]:border-success/40" },
  { value: "absent", label: "Absent", icon: X, cls: "data-[active=true]:bg-destructive/15 data-[active=true]:text-destructive data-[active=true]:border-destructive/40" },
  { value: "late", label: "Late", icon: Clock, cls: "data-[active=true]:bg-warning/15 data-[active=true]:text-warning data-[active=true]:border-warning/40" },
  { value: "excused", label: "Excused", icon: FileText, cls: "data-[active=true]:bg-info/15 data-[active=true]:text-info data-[active=true]:border-info/40" },
];

interface Props {
  sessionId: string;
  groupId: string;
  branchId: string;
  roster: SessionRosterRow[] | undefined;
  isLoading: boolean;
  canEdit: boolean;
}

export function AttendanceMarker({
  sessionId,
  groupId,
  branchId,
  roster,
  isLoading,
  canEdit,
}: Props) {
  const mark = useMarkAttendance(sessionId);
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!roster || roster.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
        <User2 className="mx-auto size-10 text-muted-foreground/60" strokeWidth={1.25} />
        <h3 className="mt-3 font-main text-base font-semibold text-foreground">
          No active students enrolled
        </h3>
      </div>
    );
  }

  const handle = async (studentId: string, status: Status) => {
    setPendingId(studentId + status);
    try {
      await mark.mutateAsync({
        session_id: sessionId,
        group_id: groupId,
        branch_id: branchId,
        student_id: studentId,
        status,
      });
      toast.success("Attendance saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setPendingId(null);
    }
  };

  const counts = roster.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<Status, number>,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs">
        {STATUSES.map((s) => (
          <span
            key={s.value}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-muted-foreground"
          >
            <s.icon className="size-3.5" />
            {s.label}: <span className="font-semibold text-foreground">{counts[s.value] ?? 0}</span>
          </span>
        ))}
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{roster.length}</span>
        </span>
      </div>

      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        {roster.map((r) => (
          <div
            key={r.student_id}
            className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-9 rounded-full bg-kojo-gradient flex items-center justify-center text-white text-xs font-semibold shrink-0">
                {(r.full_name ?? "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground text-sm">
                  {r.full_name ?? "Unnamed"}
                </p>
                {r.is_locked && (
                  <p className="text-xs text-muted-foreground">Locked</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => {
                const active = r.status === s.value;
                const busy = pendingId === r.student_id + s.value;
                const disabled = !canEdit || r.is_locked || mark.isPending;
                return (
                  <Button
                    key={s.value}
                    type="button"
                    size="sm"
                    variant="outline"
                    data-active={active}
                    disabled={disabled}
                    onClick={() => handle(r.student_id, s.value)}
                    className={cn(
                      "h-8 gap-1.5 border-border bg-transparent text-muted-foreground hover:text-foreground",
                      s.cls,
                    )}
                  >
                    {busy ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <s.icon className="size-3.5" />
                    )}
                    {s.label}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {!canEdit && (
        <p className="text-xs text-muted-foreground">
          You don't have permission to edit attendance.
        </p>
      )}
    </div>
  );
}
