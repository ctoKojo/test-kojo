// Kojobot — Enrollments history tab
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
import type { StudentEnrollment } from "@/lib/api/student-details";

interface Props {
  rows: StudentEnrollment[] | undefined;
  isLoading: boolean;
}

function statusVariant(
  s: string,
): "success" | "warning" | "danger" | "info" | "neutral" {
  switch (s) {
    case "active":
      return "success";
    case "completed":
      return "info";
    case "dropped":
    case "cancelled":
      return "danger";
    case "transferred":
      return "warning";
    default:
      return "neutral";
  }
}

function fmt(d: string | null) {
  if (!d) return "—";
  try {
    return format(new Date(d), "dd MMM yyyy");
  } catch {
    return "—";
  }
}

export function EnrollmentsTab({ rows, isLoading }: Props) {
  if (isLoading) {
    return (
      <KojoCard>
        <Skeleton className="h-40 w-full" />
      </KojoCard>
    );
  }
  if (!rows || rows.length === 0) {
    return (
      <KojoCard>
        <p className="py-10 text-center text-sm text-muted-foreground">
          No enrollments yet.
        </p>
      </KojoCard>
    );
  }

  return (
    <KojoCard className="p-0 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Group</TableHead>
            <TableHead>Level</TableHead>
            <TableHead>Billing</TableHead>
            <TableHead>Enrolled</TableHead>
            <TableHead>Ended</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((e) => {
            const ended = e.completed_at ?? e.dropped_at;
            return (
              <TableRow key={e.id}>
                <TableCell className="font-medium text-foreground">
                  {e.group?.name ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {e.group?.level?.name ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {e.billing_type}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {fmt(e.enrolled_at)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {fmt(ended)}
                </TableCell>
                <TableCell>
                  <KojoBadge variant={statusVariant(e.status)}>
                    {e.status}
                  </KojoBadge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </KojoCard>
  );
}
