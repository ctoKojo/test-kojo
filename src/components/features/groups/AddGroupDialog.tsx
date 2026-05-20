// Kojobot — Add Group dialog
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createGroup,
  listTrainersForSelect,
  PACKAGE_TIERS,
  SUBSCRIPTION_TYPES,
} from "@/lib/api/groups";
import { useLevelsFilter, groupsKeys } from "@/hooks/queries/useGroups";
import { listBranchesForFilter } from "@/lib/api/students";
import { useAuth } from "@/lib/auth/useAuth";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddGroupDialog({ open, onOpenChange }: Props) {
  const { activeBranchId, branchIds, hasRole } = useAuth();
  const isSuperAdmin = hasRole("super_admin");
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState<string>("");
  const [levelId, setLevelId] = useState<string>("");
  const [trainerId, setTrainerId] = useState<string>("");
  const [tier, setTier] = useState<(typeof PACKAGE_TIERS)[number]>("core");
  const [subType, setSubType] =
    useState<(typeof SUBSCRIPTION_TYPES)[number]>("offline");
  const [onlineLink, setOnlineLink] = useState("");
  const [maxStudents, setMaxStudents] = useState(8);
  const [startsOn, setStartsOn] = useState("");

  // Reset on open
  useEffect(() => {
    if (open) {
      setName("");
      setBranchId(isSuperAdmin ? "" : activeBranchId ?? branchIds[0] ?? "");
      setLevelId("");
      setTrainerId("");
      setTier("core");
      setSubType("offline");
      setOnlineLink("");
      setMaxStudents(8);
      setStartsOn("");
    }
  }, [open, isSuperAdmin, activeBranchId, branchIds]);

  const branches = useQuery({
    queryKey: ["branches", "filter"],
    queryFn: listBranchesForFilter,
    enabled: open && isSuperAdmin,
    staleTime: 5 * 60_000,
  });
  const levels = useLevelsFilter();
  const trainers = useQuery({
    queryKey: ["trainers", "select", branchId || null],
    queryFn: () => listTrainersForSelect(branchId || null),
    enabled: open && !!branchId,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      toast.success("Group created");
      qc.invalidateQueries({ queryKey: groupsKeys.all });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      onOpenChange(false);
    },
    onError: (e: Error) => {
      toast.error(`Failed to create group: ${e.message}`);
    },
  });

  const canSubmit =
    name.trim().length > 0 &&
    !!branchId &&
    !!levelId &&
    !!trainerId &&
    maxStudents > 0 &&
    (subType === "offline" || onlineLink.trim().length > 0);

  const submit = () => {
    if (!canSubmit) return;
    mutation.mutate({
      name,
      branch_id: branchId,
      level_id: levelId,
      trainer_id: trainerId,
      package_tier: tier,
      subscription_type: subType,
      online_link: onlineLink || null,
      max_students: maxStudents,
      starts_on: startsOn || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-main">Create new group</DialogTitle>
          <DialogDescription>
            Fill in the basics — you can edit details later from the group page.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="g-name">Group name</Label>
            <Input
              id="g-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Saturday Morning Core"
            />
          </div>

          {isSuperAdmin && (
            <div className="grid gap-2">
              <Label>Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {(branches.data ?? []).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Level</Label>
              <Select value={levelId} onValueChange={setLevelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {(levels.data ?? []).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Trainer</Label>
              <Select
                value={trainerId}
                onValueChange={setTrainerId}
                disabled={!branchId || trainers.isLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !branchId
                        ? "Pick branch first"
                        : trainers.isLoading
                          ? "Loading…"
                          : (trainers.data ?? []).length === 0
                            ? "No trainers in branch"
                            : "Select trainer"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(trainers.data ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.full_name ?? t.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Package tier</Label>
              <Select
                value={tier}
                onValueChange={(v) => setTier(v as typeof tier)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PACKAGE_TIERS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Format</Label>
              <Select
                value={subType}
                onValueChange={(v) => setSubType(v as typeof subType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBSCRIPTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {subType !== "offline" && (
            <div className="grid gap-2">
              <Label htmlFor="g-link">Online link</Label>
              <Input
                id="g-link"
                value={onlineLink}
                onChange={(e) => setOnlineLink(e.target.value)}
                placeholder="https://meet.example.com/..."
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="g-max">Max students</Label>
              <Input
                id="g-max"
                type="number"
                min={1}
                max={30}
                value={maxStudents}
                onChange={(e) => setMaxStudents(Number(e.target.value) || 1)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="g-start">Start date</Label>
              <Input
                id="g-start"
                type="date"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!canSubmit || mutation.isPending}
            className="bg-kojo-gradient text-white border-transparent hover:opacity-90"
          >
            {mutation.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            Create group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
