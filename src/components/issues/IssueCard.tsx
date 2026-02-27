import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { ThumbsUp, MapPin, Clock, MessageSquare, Pencil, Trash2, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Issue {
  id: string;
  title: string;
  category: string;
  status: string;
  priority_score: number;
  report_count: number;
  upvote_count: number;
  created_at: string;
  lat: number;
  lng: number;
  cancellation_reason?: string | null;
  reporter_id?: string;
}

interface IssueCardProps {
  issue: Issue;
  linkPrefix?: string;
  showActions?: boolean;
  currentUserId?: string;
  onDelete?: (id: string) => void;
}

export const IssueCard = ({ issue, linkPrefix = "/citizen", showActions = false, currentUserId, onDelete }: IssueCardProps) => {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const isOwner = currentUserId && issue.reporter_id === currentUserId;
  const canEdit = showActions && isOwner && (issue.status === "open" || issue.status === "in_progress");
  const canDelete = showActions && isOwner && issue.status === "open";

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.from("issues").delete().eq("id", issue.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Issue deleted" });
      onDelete?.(issue.id);
    }
    setDeleting(false);
  };

  return (
    <Card className={`group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer border-l-4 border-l-transparent hover:border-l-primary ${issue.status === "cancelled" ? "opacity-70" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <Link to={`${linkPrefix}/issues/${issue.id}`} className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">{issue.title}</h3>
            <p className="text-sm text-muted-foreground capitalize mt-1">{issue.category.replace("_", " ")}</p>
          </Link>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={issue.status} />
            <PriorityBadge score={issue.priority_score} />
          </div>
        </div>

        {issue.status === "cancelled" && issue.cancellation_reason && (
          <div className="mt-2 p-2 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-xs text-destructive flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              <span className="font-medium">Cancelled:</span> {issue.cancellation_reason}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3" />
              {issue.upvote_count}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {issue.report_count} reports
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {issue.lat.toFixed(4)}, {issue.lng.toFixed(4)}
            </span>
          </div>

          {showActions && (canEdit || canDelete) && (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {canEdit && (
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => navigate(`/citizen/issues/${issue.id}/edit`)}>
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
              {canDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Issue</AlertDialogTitle>
                      <AlertDialogDescription>This action cannot be undone. Are you sure?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                        {deleting ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
