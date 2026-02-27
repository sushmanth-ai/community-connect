import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const getPriorityLabel = (score: number) => {
  if (score >= 16) return "Critical";
  if (score >= 11) return "High";
  if (score >= 6) return "Medium";
  return "Low";
};

const priorityConfig: Record<string, string> = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-warning/20 text-warning",
  High: "bg-warning text-warning-foreground",
  Critical: "bg-critical text-critical-foreground",
};

export const PriorityBadge = ({ score }: { score: number }) => {
  const label = getPriorityLabel(score);
  return <Badge className={cn("border-0", priorityConfig[label])}>{label} ({score})</Badge>;
};
