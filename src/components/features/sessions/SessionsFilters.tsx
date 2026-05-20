// Kojobot — Sessions filter bar
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBranchesFilter } from "@/hooks/queries/useStudents";
import type { SessionListFilter } from "@/lib/api/sessions-list";

const ALL = "__all__";
const STATUSES = ["scheduled", "open", "closed", "cancelled", "missed"];

export interface SessionsFiltersValue {
  filter: SessionListFilter;
  status: string | null;
  branchId: string | null;
}

interface Props {
  value: SessionsFiltersValue;
  onChange: (next: SessionsFiltersValue) => void;
  isSuperAdmin: boolean;
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function SessionsFilters({ value, onChange, isSuperAdmin }: Props) {
  const { data: branches } = useBranchesFilter(isSuperAdmin);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <Tabs
        value={value.filter}
        onValueChange={(v) =>
          onChange({ ...value, filter: v as SessionListFilter })
        }
      >
        <TabsList className="bg-card">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

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
