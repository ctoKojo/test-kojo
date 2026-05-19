// Kojobot — Attendance tab (summary + records)
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
import type { StudentAttendanceResult } from "@/lib/api/student-details";

interface Props {
  data: StudentAttendanceResult | undefined;
  isLoading: boolean;
}

function statusVariant(
  s: string,
): "success" | "warning" | "danger" | "info" | "neutral" {
  switch (s) {
    case "present":
      return "success";
    case "late":
      return "warning";
    case "excused":
      return "info";
    case "absent":
      return "danger";
    default:
      return "neutral";
  }
}

export function AttendanceTab({ data, isLoading }: Props) {
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
          No attendance records yet.
        </p>
      </KojoCard>
    );
  }

  const { rows, summary } = data;
  const pctColor =
    summary.percentage >= 80
      ? "text-success"
      : summary.percentage >= 60
        ? "text-warning"
        : "text-destructive";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KojoCard variant="stat" accent="cyan">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Attendance
          </div>
          <div className={`mt-1 font-title text-2xl ${pctColor}`}>
            {summary.percentage}%
          </div>
        </KojoCard>
        <Stat label="Present" value={summary.present} tone="success" />
        <Stat label="Late" value={summary.late} tone="warning" />
        <Stat label="Excused" value={summary.excused} tone="info" />
        <Stat label="Absent" value={summary.absent} tone="danger" />
      </div>

      <KojoCard className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Session #</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-muted-foreground">
                  {r.session?.scheduled_at_utc
                    ? format(
                        new Date(r.session.scheduled_at_utc),
                        "dd MMM yyyy · HH:mm",
                      )
                    : "—"}
                </TableCell>
                <TableCell className="text-foreground">
                  {r.session?.group?.name ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {r.session?.session_number ?? "—"}
                </TableCell>
                <TableCell>
                  <KojoBadge variant={statusVariant(r.status)}>
                    {r.status}
                  </KojoBadge>
                </TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">
                  {r.notes ?? "—"}
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
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "info" | "danger";
}) {
  const color = {
    success: "text-success",
    warning: "text-warning",
    info: "text-kojo-cyan",
    danger: "text-destructive",
  }[tone];
  return (
    <KojoCard variant="stat" accent={tone === "info" ? "cyan" : tone}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 font-title text-2xl ${color}`}>{value}</div>
    </KojoCard>
  );
}
