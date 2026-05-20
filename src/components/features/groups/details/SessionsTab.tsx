// Kojobot — Group sessions tab
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
import type { SessionRow } from "@/lib/api/group-details";

interface Props {
  rows: SessionRow[] | undefined;
  isLoading: boolean;
}

function variantOf(
  s: string,
): "success" | "warning" | "danger" | "info" | "neutral" {
  switch (s) {
    case "closed":
      return "success";
    case "open":
      return "info";
    case "scheduled":
      return "neutral";
    case "cancelled":
      return "danger";
    case "missed":
      return "warning";
    default:
      return "neutral";
  }
}

function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SessionsTab({ rows, isLoading }: Props) {
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
        <Calendar
          className="mx-auto size-10 text-muted-foreground/60"
          strokeWidth={1.25}
        />
        <h3 className="mt-3 font-main text-base font-semibold text-foreground">
          No sessions scheduled
        </h3>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border">
            <TableHead className="w-[80px]">#</TableHead>
            <TableHead>Scheduled</TableHead>
            <TableHead>Trainer</TableHead>
            <TableHead>Room</TableHead>
            <TableHead className="w-[120px]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((s) => (
            <TableRow
              key={s.id}
              className="border-border hover:bg-kojo-cyan/5 transition-colors cursor-pointer"
            >
              <TableCell className="font-medium text-foreground">
                <Link
                  to="/sessions/$sessionId"
                  params={{ sessionId: s.id }}
                  className="hover:text-kojo-cyan"
                >
                  #{s.session_number}
                </Link>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                <Link to="/sessions/$sessionId" params={{ sessionId: s.id }}>
                  {fmtDateTime(s.scheduled_at_utc)}
                </Link>
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
