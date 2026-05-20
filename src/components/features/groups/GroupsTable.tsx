// Kojobot — Groups table (presentational)
import { Layers } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KojoBadge } from "@/components/ui/kojo/kojo-badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { GroupListItem } from "@/lib/api/groups";

interface Props {
  items: GroupListItem[];
  isLoading: boolean;
  isFetching: boolean;
  showBranch: boolean;
}

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

export function GroupsTable({ items, isLoading, isFetching, showBranch }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card">
        <div className="space-y-3 p-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
        <Layers
          className="mx-auto size-10 text-muted-foreground/60"
          strokeWidth={1.25}
        />
        <h3 className="mt-3 font-main text-base font-semibold text-foreground">
          No groups found
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Try adjusting filters, or create a new group to get started.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-border bg-card overflow-hidden"
      data-fetching={isFetching ? "true" : undefined}
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border">
            <TableHead className="w-[260px]">Group</TableHead>
            <TableHead>Level</TableHead>
            <TableHead>Trainer</TableHead>
            {showBranch && <TableHead>Branch</TableHead>}
            <TableHead>Room</TableHead>
            <TableHead className="w-[120px]">Capacity</TableHead>
            <TableHead className="w-[140px]">Starts</TableHead>
            <TableHead className="w-[120px]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((g) => {
            const cap = g.max_students ?? 0;
            const ratio = cap > 0 ? g.enrolled_count / cap : 0;
            const capColor =
              ratio >= 1
                ? "text-destructive"
                : ratio >= 0.8
                  ? "text-kojo-cyan"
                  : "text-muted-foreground";
            return (
              <TableRow
                key={g.id}
                className="border-border hover:bg-kojo-cyan/5 transition-colors"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-kojo-gradient text-white">
                      <Layers className="size-4" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {g.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground capitalize">
                        {g.subscription_type ?? "—"}
                        {g.package_tier ? ` · ${g.package_tier}` : ""}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {g.level?.name ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {g.trainer?.full_name ?? (
                    <span className="italic text-muted-foreground/60">
                      Unassigned
                    </span>
                  )}
                </TableCell>
                {showBranch && (
                  <TableCell className="text-sm text-muted-foreground">
                    {g.branch?.name ?? "—"}
                  </TableCell>
                )}
                <TableCell className="text-sm text-muted-foreground">
                  {g.room?.name ?? "—"}
                </TableCell>
                <TableCell className={`text-sm font-medium ${capColor}`}>
                  {g.enrolled_count} / {g.max_students ?? "∞"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {fmtDate(g.starts_on)}
                </TableCell>
                <TableCell>
                  <KojoBadge variant={statusVariant(g.status)}>
                    {g.status}
                  </KojoBadge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
