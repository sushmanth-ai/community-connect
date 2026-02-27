import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/issues/StatusBadge";
import { PriorityBadge } from "@/components/issues/PriorityBadge";
import { IssuePipeline } from "@/components/issues/IssuePipeline";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { ThumbsUp, Clock, MapPin, MessageSquare, IndianRupee, CalendarDays, AlertCircle } from "lucide-react";
import { formatDistanceToNow, format, addDays } from "date-fns";

const IssueDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [issue, setIssue] = useState<any>(null);
  const [statusLogs, setStatusLogs] = useState<any[]>([]);
  const [workDetails, setWorkDetails] = useState<any>(null);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    const fetchData = async () => {
      const [issueRes, logsRes, upvoteRes, wdRes] = await Promise.all([
        supabase.from("issues").select("*").eq("id", id).single(),
        supabase.from("status_logs").select("*").eq("issue_id", id).order("created_at", { ascending: true }),
        supabase.from("upvotes").select("id").eq("issue_id", id).eq("user_id", user.id).maybeSingle(),
        supabase.from("issue_work_details" as any).select("*").eq("issue_id", id).maybeSingle(),
      ]);
      if (issueRes.data) setIssue(issueRes.data);
      if (logsRes.data) setStatusLogs(logsRes.data);
      setHasUpvoted(!!upvoteRes.data);
      if (wdRes.data) setWorkDetails(wdRes.data);
      setLoading(false);
    };
    fetchData();
  }, [id, user]);

  const handleUpvote = async () => {
    if (!user || !id) return;
    if (hasUpvoted) {
      await supabase.from("upvotes").delete().eq("user_id", user.id).eq("issue_id", id);
      setHasUpvoted(false);
      setIssue((prev: any) => prev ? { ...prev, upvote_count: prev.upvote_count - 1 } : prev);
      toast({ title: "Upvote removed" });
    } else {
      const { error } = await supabase.from("upvotes").insert({ user_id: user.id, issue_id: id });
      if (error) { toast({ title: "Failed to upvote", description: error.message, variant: "destructive" }); return; }
      setHasUpvoted(true);
      setIssue((prev: any) => prev ? { ...prev, upvote_count: prev.upvote_count + 1 } : prev);
      toast({ title: "Upvoted!" });
    }
  };

  if (loading) return <AppLayout><p className="text-muted-foreground">Loading...</p></AppLayout>;
  if (!issue) return <AppLayout><p className="text-muted-foreground">Issue not found.</p></AppLayout>;

  const budgetRemaining = workDetails ? (workDetails.budget_allocated || 0) - (workDetails.amount_used || 0) : 0;
  const estimatedEnd = workDetails?.work_start_date && workDetails?.estimated_days
    ? addDays(new Date(workDetails.work_start_date), workDetails.estimated_days)
    : null;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{issue.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <StatusBadge status={issue.status} />
            <PriorityBadge score={issue.priority_score} />
            <span className="text-sm text-muted-foreground capitalize">{issue.category.replace("_", " ")}</span>
          </div>
        </div>

        {/* Pipeline */}
        <Card>
          <CardHeader><CardTitle className="text-base">Issue Pipeline</CardTitle></CardHeader>
          <CardContent>
            <IssuePipeline status={issue.status} hasExtension={!!workDetails?.extension_reason} />
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardContent className="p-6">
            <p className="text-foreground whitespace-pre-wrap">{issue.description}</p>
            {issue.image_url && (
              <img src={issue.image_url} alt="Issue" className="mt-4 rounded-lg max-h-64 object-cover" />
            )}
          </CardContent>
        </Card>

        {/* Progress */}
        {workDetails && workDetails.progress_percentage !== undefined && workDetails.progress_percentage !== null && (
          <Card>
            <CardHeader><CardTitle className="text-base">Work Progress</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">{workDetails.progress_percentage}%</span>
              </div>
              <Progress value={workDetails.progress_percentage} />
            </CardContent>
          </Card>
        )}

        {/* Budget */}
        {workDetails && workDetails.budget_allocated > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><IndianRupee className="h-4 w-4" /> Budget Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold">₹{Number(workDetails.budget_allocated).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Allocated</p>
                </div>
                <div>
                  <p className="text-lg font-bold">₹{Number(workDetails.amount_used || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Used</p>
                </div>
                <div>
                  <p className={`text-lg font-bold ${budgetRemaining < 0 ? "text-destructive" : ""}`}>₹{budgetRemaining.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Remaining</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        {workDetails && (workDetails.accepted_at || workDetails.work_start_date) && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {workDetails.accepted_at && (
                <div className="flex justify-between"><span className="text-muted-foreground">Accepted</span><span>{format(new Date(workDetails.accepted_at), "PPp")}</span></div>
              )}
              {workDetails.work_start_date && (
                <div className="flex justify-between"><span className="text-muted-foreground">Work Start</span><span>{format(new Date(workDetails.work_start_date), "PP")}</span></div>
              )}
              {estimatedEnd && (
                <div className="flex justify-between"><span className="text-muted-foreground">Est. Completion</span><span>{format(estimatedEnd, "PP")}</span></div>
              )}
              {workDetails.extended_date && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Extended To</span>
                  <span>{format(new Date(workDetails.extended_date), "PP")}</span>
                </div>
              )}
              {workDetails.extension_reason && (
                <p className="text-xs text-muted-foreground italic mt-1">Extension reason: {workDetails.extension_reason}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Decline info */}
        {workDetails?.decline_reason && (
          <Card className="border-destructive/30">
            <CardHeader><CardTitle className="text-base text-destructive">Decline Reason</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm capitalize text-muted-foreground mb-1">{workDetails.decline_category?.replace("_", " ")}</p>
              <p className="text-sm">{workDetails.decline_reason}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-4 flex-wrap">
          <Button variant={hasUpvoted ? "default" : "outline"} onClick={handleUpvote} disabled={issue.reporter_id === user?.id}>
            <ThumbsUp className="h-4 w-4 mr-2" /> {issue.upvote_count} Upvotes
          </Button>
          <span className="text-sm text-muted-foreground flex items-center gap-1"><MessageSquare className="h-4 w-4" /> {issue.report_count} reports</span>
          <span className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-4 w-4" /> {issue.lat.toFixed(4)}, {issue.lng.toFixed(4)}</span>
          <span className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-4 w-4" /> {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}</span>
        </div>

        {/* Status Timeline */}
        <Card>
          <CardHeader><CardTitle className="text-base">Status Timeline</CardTitle></CardHeader>
          <CardContent>
            {statusLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No status changes yet</p>
            ) : (
              <div className="space-y-3">
                {statusLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                    <div>
                      <p className="font-medium">
                        {log.old_status ? `${log.old_status.replace("_", " ")} → ` : ""}{log.new_status.replace("_", " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">{format(new Date(log.created_at), "PPp")}</p>
                      {log.note && <p className="text-muted-foreground mt-1">{log.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default IssueDetail;
