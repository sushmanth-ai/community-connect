import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { ThumbsUp, MapPin, Clock, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
}

export const IssueCard = ({ issue, linkPrefix = "/citizen" }: { issue: Issue; linkPrefix?: string }) => {
  return (
    <Link to={`${linkPrefix}/issues/${issue.id}`}>
      <Card className="group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer border-l-4 border-l-transparent hover:border-l-primary">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">{issue.title}</h3>
              <p className="text-sm text-muted-foreground capitalize mt-1">{issue.category.replace("_", " ")}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <StatusBadge status={issue.status} />
              <PriorityBadge score={issue.priority_score} />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
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
        </CardContent>
      </Card>
    </Link>
  );
};
