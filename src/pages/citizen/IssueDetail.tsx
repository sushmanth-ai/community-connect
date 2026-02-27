import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/issues/StatusBadge";
import { PriorityBadge } from "@/components/issues/PriorityBadge";
import { toast } from "@/hooks/use-toast";
import { ThumbsUp, Clock, MapPin, User, MessageSquare } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

const IssueDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [issue, setIssue] = useState<any>(null);
  const [statusLogs, setStatusLogs] = useState<any[]>([]);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    const fetch = async () => {
      const [issueRes, logsRes, upvoteRes] = await Promise.all([
        supabase.from("issues").select("*").eq("id", id).single(),
        supabase.from("status_logs").select("*").eq("issue_id", id).order("created_at", { ascending: true }),
        supabase.from("upvotes").select("id").eq("issue_id", id).eq("user_id", user.id).maybeSingle(),
      ]);
      if (issueRes.data) setIssue(issueRes.data);
      if (logsRes.data) setStatusLogs(logsRes.data);
      setHasUpvoted(!!upvoteRes.data);
      setLoading(false);
    };
    fetch();
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
      if (error) {
        toast({ title: "Failed to upvote", description: error.message, variant: "destructive" });
        return;
      }
      setHasUpvoted(true);
      setIssue((prev: any) => prev ? { ...prev, upvote_count: prev.upvote_count + 1 } : prev);
      toast({ title: "Upvoted!" });
    }
  };

  if (loading) return <AppLayout><p className="text-muted-foreground">Loading...</p></AppLayout>;
  if (!issue) return <AppLayout><p className="text-muted-foreground">Issue not found.</p></AppLayout>;

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

        <Card>
          <CardContent className="p-6">
            <p className="text-foreground whitespace-pre-wrap">{issue.description}</p>
            {issue.image_url && (
              <img src={issue.image_url} alt="Issue" className="mt-4 rounded-lg max-h-64 object-cover" />
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <Button variant={hasUpvoted ? "default" : "outline"} onClick={handleUpvote} disabled={issue.reporter_id === user?.id}>
            <ThumbsUp className="h-4 w-4 mr-2" />
            {issue.upvote_count} Upvotes
          </Button>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <MessageSquare className="h-4 w-4" /> {issue.report_count} reports
          </span>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-4 w-4" /> {issue.lat.toFixed(4)}, {issue.lng.toFixed(4)}
          </span>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-4 w-4" /> {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
          </span>
        </div>

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
