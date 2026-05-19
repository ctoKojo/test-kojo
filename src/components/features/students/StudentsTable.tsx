// Kojobot — Students table
// Pure presentational. Receives data + handlers from parent route.

import { Link } from "@tanstack/react-router";
import { MoreHorizontal, User as UserIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KojoBadge } from "@/components/ui/kojo/kojo-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  calculateAge,
  type StudentListItem,
  type SubscriptionStatus,
} from "@/lib/api/students";

interface Props {
  items: StudentListItem[];
  isLoading: boolean;
  isFetching: boolean;
  showBranch: boolean;
}

function statusVariant(
  s: SubscriptionStatus,
): "success" | "warning" | "danger" | "info" | "neutral" {
  switch (s) {
    case "active":
      return "success";
    case "active_waiting":
    case "pending_payment":
      return "warning";
    case "restricted":
    case "expired":
    case "cancelled":
      return "danger";
    case "paused":
    case "frozen":
      return "info";
    default:
      return "neutral";
  }
}

function formatStatus(s: SubscriptionStatus): string {
  return s.replace(/_/g, " ");
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

export function StudentsTable({
  items,
  isLoading,
  isFetching,
  showBranch,
}: Props) {
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
        <UserIcon
          className="mx-auto size-10 text-muted-foreground/60"
          strokeWidth={1.25}
        />
        <h3 className="mt-3 font-main text-base font-semibold text-foreground">
          No students found
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Try adjusting filters, or add a new student to get started.
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
            <TableHead className="w-[280px]">Student</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="w-[80px]">Age</TableHead>
            {showBranch && <TableHead>Branch</TableHead>}
            <TableHead>Group</TableHead>
            <TableHead>Level</TableHead>
            <TableHead className="w-[140px]">Status</TableHead>
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((s) => {
            const age = calculateAge(s.birthdate);
            const name = s.profile?.full_name ?? "Unnamed";
            return (
              <TableRow
                key={s.id}
                className="border-border hover:bg-kojo-cyan/5 transition-colors"
              >
                <TableCell>
                  <Link
                    to="/students/$studentId"
                    params={{ studentId: s.id }}
                    className="flex items-center gap-3 group"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-kojo-gradient text-xs font-semibold text-white">
                      {initials(name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground group-hover:text-kojo-cyan transition-colors">
                        {name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.profile?.email ?? "—"}
                      </p>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {s.profile?.phone ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {age ?? "—"}
                </TableCell>
                {showBranch && (
                  <TableCell className="text-sm text-muted-foreground">
                    {s.branch?.name ?? "—"}
                  </TableCell>
                )}
                <TableCell className="text-sm text-muted-foreground">
                  {s.current_group?.name ?? (
                    <span className="italic text-muted-foreground/60">
                      No group
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {s.current_level?.name ?? "—"}
                </TableCell>
                <TableCell>
                  <KojoBadge variant={statusVariant(s.subscription_status)}>
                    {formatStatus(s.subscription_status)}
                  </KojoBadge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-kojo-cyan/10 hover:text-kojo-cyan">
                      <MoreHorizontal className="size-4" strokeWidth={1.5} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link
                          to="/students/$studentId"
                          params={{ studentId: s.id }}
                        >
                          View details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled>Edit</DropdownMenuItem>
                      <DropdownMenuItem disabled>Archive</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
