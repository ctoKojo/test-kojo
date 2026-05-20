// Kojobot — Record Payment dialog
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KojoButton } from "@/components/ui/kojo/kojo-button";
import { useRecordPayment } from "@/hooks/queries/useFinance";
import type { InstallmentRow } from "@/lib/api/finance";

interface Props {
  installment: InstallmentRow | null;
  onClose: () => void;
}

type Method = "cash" | "bank_transfer" | "wallet" | "card";

export function RecordPaymentDialog({ installment, onClose }: Props) {
  const open = !!installment;
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("cash");
  const [notes, setNotes] = useState("");
  const mutation = useRecordPayment();

  // Reset when opening with a new installment
  if (installment && amount === "") {
    setAmount(String(installment.amount));
  }

  const handleClose = () => {
    setAmount("");
    setMethod("cash");
    setNotes("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!installment) return;
    const paidAmount = Number(amount);
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    try {
      await mutation.mutateAsync({
        installmentId: installment.id,
        paidAmount,
        paymentMethod: method,
        notes: notes.trim() || null,
      });
      toast.success("Payment recorded");
      handleClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record payment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-title text-foreground">
            Record Payment
          </DialogTitle>
          <DialogDescription>
            {installment?.student?.profile?.full_name ?? "Student"} ·{" "}
            <span className="text-kojo-cyan">
              Due {installment ? new Date(installment.due_date).toLocaleDateString() : ""}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="method">Payment method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
              <SelectTrigger id="method" className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                <SelectItem value="wallet">Wallet</SelectItem>
                <SelectItem value="card">Card</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-background border-border"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <KojoButton variant="ghost" onClick={handleClose} type="button">
            Cancel
          </KojoButton>
          <KojoButton
            variant="primary"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            type="button"
          >
            {mutation.isPending ? "Saving…" : "Record Payment"}
          </KojoButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
