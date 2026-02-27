import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface AcceptIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issueId: string;
  onSuccess: () => void;
}

export const AcceptIssueDialog = ({ open, onOpenChange, issueId, onSuccess }: AcceptIssueDialogProps) => {
  const { user } = useAuth();
  const [budget, setBudget] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");
  const [workStartDate, setWorkStartDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAccept = async () => {
    if (!budget || !estimatedDays || !workStartDate) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error: detailsError } = await supabase.from("issue_work_details" as any).insert({
        issue_id: issueId,
        budget_allocated: parseFloat(budget),
        estimated_days: parseInt(estimatedDays),
        work_start_date: workStartDate,
        accepted_at: new Date().toISOString(),
        accepted_by: user?.id,
        progress_percentage: 0,
        amount_used: 0,
      });
      if (detailsError) throw detailsError;

      const { error: statusError } = await supabase
        .from("issues")
        .update({ status: "accepted" as any })
        .eq("id", issueId);
      if (statusError) throw statusError;

      toast({ title: "Issue accepted" });
      onSuccess();
      onOpenChange(false);
      setBudget(""); setEstimatedDays(""); setWorkStartDate("");
    } catch (err: any) {
      toast({ title: "Failed to accept", description: err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accept Issue</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Budget Allocation (₹)</Label>
            <Input type="number" placeholder="e.g. 50000" value={budget} onChange={(e) => setBudget(e.target.value)} />
          </div>
          <div>
            <Label>Estimated Completion (days)</Label>
            <Input type="number" placeholder="e.g. 7" value={estimatedDays} onChange={(e) => setEstimatedDays(e.target.value)} />
          </div>
          <div>
            <Label>Work Start Date</Label>
            <Input type="date" value={workStartDate} onChange={(e) => setWorkStartDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAccept} disabled={submitting}>
            {submitting ? "Accepting..." : "Accept Issue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
