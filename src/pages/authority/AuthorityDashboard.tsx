import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IssueCard } from "@/components/issues/IssueCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/issues/StatusBadge";
import { PriorityBadge } from "@/components/issues/PriorityBadge";
import { toast } from "@/hooks/use-toast";
import { Clock, CheckCircle, AlertTriangle, BarChart3 } from "lucide-react";
import { differenceInHours, formatDistanceToNow } from "date-fns";

const AuthorityDashboard = () => {
  const { user, departmentId } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [departments, setDepartments] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, resolved: 0, escalated: 0, avgTime: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDepts = async () => {
      const { data } = await supabase.from("departments").select("*");
      if (data) setDepartments(data);
    };
    fetchDepts();
  }, []);

  useEffect(() => {
    if (!departmentId) return;
    const fetchIssues = async () => {
      let query = supabase.from("issues").select("*").eq("department_id", departmentId).order("priority_score", { ascending: false });
      if (filter !== "all") query = query.eq("status", filter as any);
      const { data } = await query;
      const allIssues = data || [];
      setIssues(allIssues);

      // Compute stats from all dept issues
      const { data: allDept } = await supabase.from("issues").select("*").eq("department_id", departmentId);
      if (allDept) {
        const resolved = allDept.filter((i) => i.status === "resolved");
        setStats({
          total: allDept.length,
          resolved: resolved.length,
          escalated: allDept.filter((i) => i.status === "escalated").length,
          avgTime: resolved.length > 0 ? Math.round(resolved.reduce((sum, i) => sum + differenceInHours(new Date(i.updated_at), new Date(i.created_at)), 0) / resolved.length) : 0,
        });
      }
      setLoading(false);
    };
    fetchIssues();
  }, [departmentId, filter]);

  const sla = departments.find((d) => d.id === departmentId)?.sla_hours || 48;

  const updateStatus = async (issueId: string, newStatus: string) => {
    const { error } = await supabase.from("issues").update({ status: newStatus as any }).eq("id", issueId);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status updated" });
      setIssues((prev) => prev.map((i) => i.id === issueId ? { ...i, status: newStatus } : i));
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Authority Dashboard</h1>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard icon={<Clock />} label="Total Issues" value={stats.total} />
          <StatCard icon={<CheckCircle />} label="Resolved" value={stats.resolved} />
          <StatCard icon={<AlertTriangle />} label="Escalated" value={stats.escalated} />
          <StatCard icon={<BarChart3 />} label="Avg Resolution" value={`${stats.avgTime}h`} />
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Priority Issue Queue</h2>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? <p className="text-muted-foreground">Loading...</p> : issues.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No issues in your department.</p>
        ) : (
          <div className="space-y-3">
            {issues.map((issue) => {
              const hoursElapsed = differenceInHours(new Date(), new Date(issue.created_at));
              const remaining = sla - hoursElapsed;
              const isOverdue = remaining <= 0 && issue.status !== "resolved";

              return (
                <Card key={issue.id} className={isOverdue ? "border-critical/50" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-medium">{issue.title}</h3>
                        <p className="text-sm text-muted-foreground capitalize mt-1">{issue.category.replace("_", " ")}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <StatusBadge status={issue.status} />
                          <PriorityBadge score={issue.priority_score} />
                          {isOverdue ? (
                            <span className="text-xs text-critical font-medium">⚠ SLA Overdue by {Math.abs(remaining)}h</span>
                          ) : issue.status !== "resolved" ? (
                            <span className="text-xs text-muted-foreground">{remaining}h remaining</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {issue.status === "open" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(issue.id, "in_progress")}>
                            Start Work
                          </Button>
                        )}
                        {(issue.status === "in_progress" || issue.status === "open") && (
                          <Button size="sm" onClick={() => updateStatus(issue.id, "resolved")}>
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: any }) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-4">
      <div className="text-primary">{icon}</div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </CardContent>
  </Card>
);

export default AuthorityDashboard;
