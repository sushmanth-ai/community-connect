import { Check, Clock, IndianRupee, Hammer, CalendarClock, CircleCheck, Send, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface IssuePipelineProps {
  status: string;
  hasExtension: boolean;
}

const stages = [
  { key: "submitted", label: "Submitted", icon: Send },
  { key: "accepted", label: "Accepted", icon: Check },
  { key: "budget_allocated", label: "Budget Allocated", icon: IndianRupee },
  { key: "work_in_progress", label: "Work In Progress", icon: Hammer },
  { key: "extended", label: "Extended", icon: CalendarClock },
  { key: "completed", label: "Completed", icon: CircleCheck },
];

const statusToStageIndex = (status: string, hasExtension: boolean): number => {
  switch (status) {
    case "open": return 0;
    case "accepted": return 2; // accepted = budget allocated too
    case "work_started": return hasExtension ? 4 : 3;
    case "completed": return 5;
    case "declined": return -1;
    default: return 0;
  }
};

export const IssuePipeline = ({ status, hasExtension }: IssuePipelineProps) => {
  if (status === "declined") {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
        <XCircle className="h-6 w-6 text-destructive" />
        <div>
          <p className="font-semibold text-destructive">Issue Declined</p>
          <p className="text-sm text-muted-foreground">This issue has been declined by the authority.</p>
        </div>
      </div>
    );
  }

  const activeIndex = statusToStageIndex(status, hasExtension);
  const filteredStages = hasExtension ? stages : stages.filter(s => s.key !== "extended");

  return (
    <div className="space-y-1">
      {filteredStages.map((stage, idx) => {
        const adjustedActive = hasExtension ? activeIndex : (activeIndex > 3 ? activeIndex - 1 : activeIndex);
        const isCompleted = idx < adjustedActive;
        const isCurrent = idx === adjustedActive;
        const Icon = stage.icon;

        return (
          <div key={stage.key} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all",
                isCompleted ? "bg-primary border-primary text-primary-foreground" :
                isCurrent ? "bg-accent border-primary text-primary" :
                "bg-muted border-border text-muted-foreground"
              )}>
                <Icon className="h-4 w-4" />
              </div>
              {idx < filteredStages.length - 1 && (
                <div className={cn("w-0.5 h-6", isCompleted ? "bg-primary" : "bg-border")} />
              )}
            </div>
            <div className="pt-1">
              <p className={cn(
                "text-sm font-medium",
                isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground"
              )}>
                {stage.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
