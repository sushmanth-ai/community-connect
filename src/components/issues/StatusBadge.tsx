import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-info text-info-foreground" },
  in_progress: { label: "In Progress", className: "bg-warning text-warning-foreground" },
  resolved: { label: "Resolved", className: "bg-success text-success-foreground" },
  escalated: { label: "Escalated", className: "bg-critical text-critical-foreground" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
};

export const StatusBadge = ({ status }: { status: string }) => {
  const config = statusConfig[status] || statusConfig.open;
  return <Badge className={cn("border-0", config.className)}>{config.label}</Badge>;
};
