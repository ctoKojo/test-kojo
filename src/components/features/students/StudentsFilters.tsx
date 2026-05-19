// Kojobot — Students filter bar
// Search input + status/branch/age-group dropdowns.
// Branch filter only renders for super_admin.

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  SUBSCRIPTION_STATUSES,
  type SubscriptionStatus,
} from "@/lib/api/students";
import {
  useAgeGroupsFilter,
  useBranchesFilter,
} from "@/hooks/queries/useStudents";

export interface StudentsFiltersValue {
  search: string;
  status: SubscriptionStatus | null;
  branchId: string | null;
  ageGroupId: string | null;
}

interface Props {
  value: StudentsFiltersValue;
  onChange: (next: StudentsFiltersValue) => void;
  isSuperAdmin: boolean;
}

const ALL = "__all__";

function formatStatus(s: SubscriptionStatus): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StudentsFilters({ value, onChange, isSuperAdmin }: Props) {
  const { data: branches } = useBranchesFilter(isSuperAdmin);
  const { data: ageGroups } = useAgeGroupsFilter();

  const hasFilters =
    value.search || value.status || value.branchId || value.ageGroupId;

  const reset = () =>
    onChange({ search: "", status: null, branchId: null, ageGroupId: null });

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[220px] max-w-md">
        <Search
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={1.5}
        />
        <Input
          placeholder="Search by name, phone, or email…"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          className="pl-9 bg-card border-border"
        />
      </div>

      {/* Status */}
      <Select
        value={value.status ?? ALL}
        onValueChange={(v) =>
          onChange({
            ...value,
            status: v === ALL ? null : (v as SubscriptionStatus),
          })
        }
      >
        <SelectTrigger className="w-[180px] bg-card border-border">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {SUBSCRIPTION_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {formatStatus(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Branch — super_admin only */}
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

      {/* Age group */}
      <Select
        value={value.ageGroupId ?? ALL}
        onValueChange={(v) =>
          onChange({ ...value, ageGroupId: v === ALL ? null : v })
        }
      >
        <SelectTrigger className="w-[160px] bg-card border-border">
          <SelectValue placeholder="Age group" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All ages</SelectItem>
          {(ageGroups ?? []).map((g) => (
            <SelectItem key={g.id} value={g.id}>
              {g.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="mr-1 size-4" strokeWidth={1.5} />
          Clear
        </Button>
      )}
    </div>
  );
}
