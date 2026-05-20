// Kojobot — Installments filter bar
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBranchesFilter } from "@/hooks/queries/useStudents";
import type {
  InstallmentFilter,
  InstallmentStatus,
} from "@/lib/api/finance";

const ALL = "__all__";
const STATUSES: InstallmentStatus[] = [
  "pending",
  "paid",
  "overdue",
  "waived",
  "cancelled",
];

export interface InstallmentsFiltersValue {
  filter: InstallmentFilter;
  status: InstallmentStatus | null;
  branchId: string | null;
}

interface Props {
  value: InstallmentsFiltersValue;
  onChange: (next: InstallmentsFiltersValue) => void;
  isSuperAdmin: boolean;
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function InstallmentsFilters({
  value,
  onChange,
  isSuperAdmin,
}: Props) {
  const { data: branches } = useBranchesFilter(isSuperAdmin);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <Tabs
        value={value.filter}
        onValueChange={(v) =>
          onChange({ ...value, filter: v as InstallmentFilter })
        }
      >
        <TabsList className="bg-card">
          <TabsTrigger value="due_today">Due Today</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <Select
        value={value.status ?? ALL}
        onValueChange={(v) =>
          onChange({
            ...value,
            status: v === ALL ? null : (v as InstallmentStatus),
          })
        }
      >
        <SelectTrigger className="w-[160px] bg-card border-border">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {cap(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isSuperAdmin && (
        <Select
          value={value.branchId ?? ALL}
          onValueChange={(v) =>
            onChange({ ...value, branchId: v === ALL ? null : v })
          }
        >
          <SelectTrigger className="w-[180px] bg-card border-border">
            <SelectValue placeholder="Branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All branches</SelectItem>
            {(branches ?? []).map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
