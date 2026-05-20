// Kojobot — Groups filter bar
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
import { GROUP_STATUSES } from "@/lib/api/groups";
import { useBranchesFilter } from "@/hooks/queries/useStudents";
import { useLevelsFilter } from "@/hooks/queries/useGroups";

export interface GroupsFiltersValue {
  search: string;
  status: string | null;
  branchId: string | null;
  levelId: string | null;
}

interface Props {
  value: GroupsFiltersValue;
  onChange: (next: GroupsFiltersValue) => void;
  isSuperAdmin: boolean;
}

const ALL = "__all__";

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function GroupsFilters({ value, onChange, isSuperAdmin }: Props) {
  const { data: branches } = useBranchesFilter(isSuperAdmin);
  const { data: levels } = useLevelsFilter();

  const hasFilters =
    value.search || value.status || value.branchId || value.levelId;

  const reset = () =>
    onChange({ search: "", status: null, branchId: null, levelId: null });

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative flex-1 min-w-[220px] max-w-md">
        <Search
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={1.5}
        />
        <Input
          placeholder="Search by group name…"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          className="pl-9 bg-card border-border"
        />
      </div>

      <Select
        value={value.status ?? ALL}
        onValueChange={(v) =>
          onChange({ ...value, status: v === ALL ? null : v })
        }
      >
        <SelectTrigger className="w-[160px] bg-card border-border">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {GROUP_STATUSES.map((s) => (
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

      <Select
        value={value.levelId ?? ALL}
        onValueChange={(v) =>
          onChange({ ...value, levelId: v === ALL ? null : v })
        }
      >
        <SelectTrigger className="w-[180px] bg-card border-border">
          <SelectValue placeholder="Level" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All levels</SelectItem>
          {(levels ?? []).map((l) => (
            <SelectItem key={l.id} value={l.id}>
              {l.name}
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
