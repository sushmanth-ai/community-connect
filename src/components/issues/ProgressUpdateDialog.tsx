import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ProgressUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issueId: string;
  currentProgress: number;
  budgetAllocated: number;
  onSuccess: () => void;
}

export const ProgressUpdateDialog = ({ open, onOpenChange, issueId, currentProgress, budgetAllocated, onSuccess }: ProgressUpdateDialogProps) => {
  const [progress, setProgress] = useState(String(currentProgress));
  const [amountUsed, setAmountUsed] = useState("");
  const [extensionReason, setExtensionReason] = useState("");
  const [extendedDate, setExtendedDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const showExtension = progress === "extension";

  const handleUpdate = async () => {
    setSubmitting(true);
    try {
      const progressVal = showExtension ? currentProgress : parseInt(progress);
      const updateData: any = { progress_percentage: progressVal };

      if (amountUsed) updateData.amount_used = parseFloat(amountUsed);
      if (showExtension) {
        if (!extensionReason.trim() || !extendedDate) {
          toast({ title: "Extension reason and date required", variant: "destructive" });
          setSubmitting(false);
          return;
        }
        updateData.extension_reason = extensionReason.trim();
        updateData.extended_date = extendedDate;
      }

      const { error } = await supabase
        .from("issue_work_details" as any)
        .update(updateData)
        .eq("issue_id", issueId);
      if (error) throw error;

      // Update issue status based on progress
      let newStatus: string | null = null;
      if (progressVal === 100) newStatus = "completed";
      else if (progressVal > 0 && currentProgress === 0) newStatus = "work_started";

      if (newStatus) {
        const { error: statusErr } = await supabase
          .from("issues")
          .update({ status: newStatus as any })
          .eq("id", issueId);
        if (statusErr) throw statusErr;
      }

      toast({ title: "Progress updated" });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Progress</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Progress</Label>
            <Select value={progress} onValueChange={setProgress}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25% Completed</SelectItem>
                <SelectItem value="50">50% Completed</SelectItem>
                <SelectItem value="75">75% Completed</SelectItem>
                <SelectItem value="100">Completed (100%)</SelectItem>
                <SelectItem value="extension">Extended Time Required</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Amount Used (₹)</Label>
            <Input type="number" placeholder={`Budget: ₹${budgetAllocated}`} value={amountUsed} onChange={(e) => setAmountUsed(e.target.value)} />
          </div>
          {showExtension && (
            <>
              <div>
                <Label>Reason for Extension</Label>
                <Textarea placeholder="Why is extension needed..." value={extensionReason} onChange={(e) => setExtensionReason(e.target.value)} rows={2} />
              </div>
              <div>
                <Label>New Expected Date</Label>
                <Input type="date" value={extendedDate} onChange={(e) => setExtendedDate(e.target.value)} />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpdate} disabled={submitting}>
            {submitting ? "Updating..." : "Update Progress"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
