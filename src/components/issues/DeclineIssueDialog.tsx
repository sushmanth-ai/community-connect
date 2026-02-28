import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface DeclineIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issueId: string;
  reporterId?: string;
  onSuccess: () => void;
}

const declineCategories = [
  { value: "duplicate", label: "Duplicate Issue" },
  { value: "invalid", label: "Invalid Complaint" },
  { value: "outside_jurisdiction", label: "Outside Jurisdiction" },
  { value: "insufficient_evidence", label: "Insufficient Evidence" },
  { value: "other", label: "Other" },
];

export const DeclineIssueDialog = ({ open, onOpenChange, issueId, reporterId, onSuccess }: DeclineIssueDialogProps) => {
  const { user } = useAuth();
  const [category, setCategory] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleDecline = async () => {
    if (!category || !reason.trim()) {
      toast({ title: "Category and reason are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error: detailsError } = await supabase.from("issue_work_details" as any).insert({
        issue_id: issueId,
        decline_category: category,
        decline_reason: reason.trim(),
        accepted_by: user?.id,
      });
      if (detailsError) throw detailsError;

      const { error: statusError } = await supabase
        .from("issues")
        .update({ status: "declined" as any })
        .eq("id", issueId);
      if (statusError) throw statusError;

      // Deduct points from the reporter
      const actualReporterId = reporterId || (await supabase.from("issues").select("reporter_id").eq("id", issueId).single()).data?.reporter_id;
      if (actualReporterId) {
        const { data: pointsData } = await supabase
          .from("points_ledger")
          .select("points")
          .eq("issue_id", issueId)
          .eq("user_id", actualReporterId);
        const totalPointsAwarded = pointsData?.reduce((sum, p) => sum + p.points, 0) || 0;
        if (totalPointsAwarded > 0) {
          await supabase.from("points_ledger").insert({
            user_id: actualReporterId,
            points: -totalPointsAwarded,
            reason: "Issue declined by authority",
            issue_id: issueId,
          });
        }
      }

      toast({ title: "Issue declined" });
      onSuccess();
      onOpenChange(false);
      setCategory(""); setReason("");
    } catch (err: any) {
      toast({ title: "Failed to decline", description: err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decline Issue</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Reason Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
              <SelectContent>
                {declineCategories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Detailed Reason</Label>
            <Textarea placeholder="Explain why this issue is being declined..." value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDecline} disabled={submitting || !category || !reason.trim()}>
            {submitting ? "Declining..." : "Decline Issue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
