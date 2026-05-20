// Kojobot — Sessions list table
import { Calendar } from "lucide-react";
import { Link } from "@tanstack/react-router";
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
import type { SessionListRow } from "@/lib/api/sessions-list";

interface Props {
  rows: SessionListRow[] | undefined;
  isLoading: boolean;
  showBranch: boolean;
}

function variantOf(
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
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SessionsTable({ rows, isLoading, showBranch }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
        <Calendar
          className="mx-auto size-10 text-muted-foreground/60"
          strokeWidth={1.25}
        />
        <h3 className="mt-3 font-main text-base font-semibold text-foreground">
          No sessions match these filters
        </h3>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border">
            <TableHead className="w-[140px]">When</TableHead>
            <TableHead>Group</TableHead>
            <TableHead>Trainer</TableHead>
            <TableHead>Room</TableHead>
            {showBranch && <TableHead>Branch</TableHead>}
            <TableHead className="w-[110px]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((s) => (
            <TableRow
              key={s.id}
              className="border-border hover:bg-kojo-cyan/5 transition-colors cursor-pointer"
            >
              <TableCell className="text-sm text-foreground font-medium">
                <Link
                  to="/sessions/$sessionId"
                  params={{ sessionId: s.id }}
                  className="hover:text-kojo-cyan"
                >
                  {fmt(s.scheduled_at_utc)}
                </Link>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {s.group ? (
                  <Link
                    to="/groups/$groupId"
                    params={{ groupId: s.group.id }}
                    className="hover:text-kojo-cyan"
                  >
                    {s.group.name}
                  </Link>
                ) : (
                  "—"
                )}
                <span className="ml-2 text-xs text-muted-foreground/60">
                  #{s.session_number}
                </span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {s.trainer?.full_name ?? (
                  <span className="italic text-muted-foreground/60">
                    Unassigned
                  </span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {s.room?.name ?? "—"}
              </TableCell>
              {showBranch && (
                <TableCell className="text-sm text-muted-foreground">
                  {s.branch?.name ?? "—"}
                </TableCell>
              )}
              <TableCell>
                <KojoBadge variant={variantOf(s.status)}>{s.status}</KojoBadge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
