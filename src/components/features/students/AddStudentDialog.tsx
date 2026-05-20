// Kojobot — Add Student dialog
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
import { listBranchesForFilter, listAgeGroupsForFilter } from "@/lib/api/students";
import { useAuth } from "@/lib/auth/useAuth";
import { createStudentFn, type CreateStudentInput } from "@/lib/api/students.functions";
import { studentsKeys } from "@/hooks/queries/useStudents";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddStudentDialog({ open, onOpenChange }: Props) {
  const { activeBranchId, branchIds, hasRole } = useAuth();
  const isSuperAdmin = hasRole("super_admin");
  const qc = useQueryClient();
  const createStudent = useServerFn(createStudentFn);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [branchId, setBranchId] = useState("");
  const [ageGroupId, setAgeGroupId] = useState("");
  const [school, setSchool] = useState("");

  useEffect(() => {
    if (open) {
      setFullName("");
      setPhone("");
      setEmail("");
      setBirthdate("");
      setGender("");
      setBranchId(isSuperAdmin ? "" : activeBranchId ?? branchIds[0] ?? "");
      setAgeGroupId("");
      setSchool("");
    }
  }, [open, isSuperAdmin, activeBranchId, branchIds]);

  const branches = useQuery({
    queryKey: ["branches", "filter"],
    queryFn: listBranchesForFilter,
    enabled: open && isSuperAdmin,
    staleTime: 5 * 60_000,
  });
  const ageGroups = useQuery({
    queryKey: ["age-groups", "filter"],
    queryFn: listAgeGroupsForFilter,
    enabled: open,
    staleTime: 10 * 60_000,
  });

  const mutation = useMutation({
    mutationFn: (data: CreateStudentInput) => createStudent({ data }),
    onSuccess: () => {
      toast.success("Student created");
      qc.invalidateQueries({ queryKey: studentsKeys.all });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      onOpenChange(false);
    },
    onError: (e: Error) => {
      toast.error(`Failed to create student: ${e.message}`);
    },
  });

  const canSubmit = fullName.trim().length >= 2 && !!branchId;

  const submit = () => {
    if (!canSubmit) return;
    mutation.mutate({
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      birthdate: birthdate || null,
      gender: gender || null,
      branch_id: branchId,
      age_group_id: ageGroupId || null,
      school: school.trim() || null,
      notes: null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-main">Add new student</DialogTitle>
          <DialogDescription>
            Creates a student profile. You can enroll them into a group afterwards.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="s-name">Full name</Label>
            <Input
              id="s-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Omar Hassan"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="s-phone">Phone</Label>
              <Input
                id="s-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="s-email">Email (optional)</Label>
              <Input
                id="s-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="parent@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="s-dob">Birthdate</Label>
              <Input
                id="s-dob"
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Gender</Label>
              <Select
                value={gender}
                onValueChange={(v) => setGender(v as "male" | "female")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              <Label>Age group</Label>
              <Select value={ageGroupId} onValueChange={setAgeGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {(ageGroups.data ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="s-school">School (optional)</Label>
              <Input
                id="s-school"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
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
            Create student
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
