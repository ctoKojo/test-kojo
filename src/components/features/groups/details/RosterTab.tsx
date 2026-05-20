// Kojobot — Group roster tab
import { Link } from "@tanstack/react-router";
import { Users2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { KojoBadge } from "@/components/ui/kojo/kojo-badge";
import type { RosterRow } from "@/lib/api/group-details";

interface Props {
  rows: RosterRow[] | undefined;
  isLoading: boolean;
}

function variantOf(
  s: string,
): "success" | "warning" | "danger" | "info" | "neutral" {
  switch (s) {
    case "active":
      return "success";
    case "completed":
      return "info";
    case "dropped":
      return "danger";
    default:
      return "neutral";
  }
}

function initials(name: string | null | undefined): string {
  if (!name) return "??";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function RosterTab({ rows, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
        <Users2
          className="mx-auto size-10 text-muted-foreground/60"
          strokeWidth={1.25}
        />
        <h3 className="mt-3 font-main text-base font-semibold text-foreground">
          No students enrolled
        </h3>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border">
            <TableHead className="w-[320px]">Student</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="w-[160px]">Enrolled</TableHead>
            <TableHead className="w-[120px]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const name = r.student?.profile?.full_name ?? "Unnamed";
            return (
              <TableRow
                key={r.enrollment_id}
                className="border-border hover:bg-kojo-cyan/5 transition-colors"
              >
                <TableCell>
                  {r.student ? (
                    <Link
                      to="/students/$studentId"
                      params={{ studentId: r.student.id }}
                      className="flex items-center gap-3 group"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-kojo-gradient text-xs font-semibold text-white">
                        {initials(name)}
                      </div>
                      <span className="text-sm font-medium text-foreground group-hover:text-kojo-cyan transition-colors">
                        {name}
                      </span>
                    </Link>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.student?.profile?.phone ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(r.enrolled_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <KojoBadge variant={variantOf(r.status)}>{r.status}</KojoBadge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
