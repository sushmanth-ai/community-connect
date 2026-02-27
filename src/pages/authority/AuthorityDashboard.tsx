import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/issues/StatusBadge";
import { PriorityBadge } from "@/components/issues/PriorityBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Clock, CheckCircle, AlertTriangle, BarChart3 } from "lucide-react";
import { differenceInHours } from "date-fns";
import { Link } from "react-router-dom";

const AuthorityDashboard = () => {
  const { departmentId, role } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [departments, setDepartments] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, resolved: 0, escalated: 0, avgTime: 0 });
  const [loading, setLoading] = useState(true);

  const isAdmin = role === "admin";
  const effectiveDeptId = isAdmin ? (deptFilter !== "all" ? deptFilter : null) : departmentId;

  useEffect(() => {
    supabase.from("departments").select("*").then(({ data }) => {
      if (data) setDepartments(data);
    });
  }, []);

  useEffect(() => {
    const fetchIssues = async () => {
      setLoading(true);
      let query = supabase.from("issues").select("*").order("priority_score", { ascending: false });
      if (effectiveDeptId) query = query.eq("department_id", effectiveDeptId);
      if (filter !== "all") query = query.eq("status", filter as any);
      const { data } = await query;
      setIssues(data || []);

      // Stats query (unfiltered by status)
      let statsQuery = supabase.from("issues").select("*");
      if (effectiveDeptId) statsQuery = statsQuery.eq("department_id", effectiveDeptId);
      const { data: allData } = await statsQuery;
      if (allData) {
        const resolved = allData.filter((i) => i.status === "resolved");
        setStats({
          total: allData.length,
          resolved: resolved.length,
          escalated: allData.filter((i) => i.status === "escalated").length,
          avgTime: resolved.length > 0 ? Math.round(resolved.reduce((sum, i) => sum + differenceInHours(new Date(i.updated_at), new Date(i.created_at)), 0) / resolved.length) : 0,
        });
      }
      setLoading(false);
    };
    fetchIssues();
  }, [effectiveDeptId, filter]);

  const sla = effectiveDeptId ? (departments.find((d) => d.id === effectiveDeptId)?.sla_hours || 48) : 48;

  const updateStatus = async (issueId: string, newStatus: string) => {
    const { error } = await supabase.from("issues").update({ status: newStatus as any }).eq("id", issueId);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status updated" });
      setIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, status: newStatus } : i)));
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Authority Dashboard</h1>
          {isAdmin && (
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All Departments" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <GradientStatCard icon={<Clock />} label="Total Issues" value={stats.total} gradient="from-blue-500 to-indigo-500" />
          <GradientStatCard icon={<CheckCircle />} label="Resolved" value={stats.resolved} gradient="from-emerald-500 to-teal-400" />
          <GradientStatCard icon={<AlertTriangle />} label="Escalated" value={stats.escalated} gradient="from-red-500 to-pink-500" />
          <GradientStatCard icon={<BarChart3 />} label="Avg Resolution" value={`${stats.avgTime}h`} gradient="from-amber-500 to-orange-400" />
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
          <p className="text-muted-foreground text-center py-12">No issues found.</p>
        ) : (
          <div className="space-y-3">
            {issues.map((issue) => {
              const hoursElapsed = differenceInHours(new Date(), new Date(issue.created_at));
              const remaining = sla - hoursElapsed;
              const isOverdue = remaining <= 0 && issue.status !== "resolved";

              return (
                <Card key={issue.id} className={`group hover:shadow-lg hover:scale-[1.01] transition-all duration-300 ${isOverdue ? "border-destructive/50 bg-destructive/5" : "hover:border-primary/30"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <Link to={`/authority/issues/${issue.id}`} className="flex-1 min-w-0">
                        <h3 className="font-medium group-hover:text-primary transition-colors">{issue.title}</h3>
                        <p className="text-sm text-muted-foreground capitalize mt-1">{issue.category.replace("_", " ")}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <StatusBadge status={issue.status} />
                          <PriorityBadge score={issue.priority_score} />
                          {isOverdue ? (
                            <span className="text-xs text-destructive font-medium">⚠ SLA Overdue by {Math.abs(remaining)}h</span>
                          ) : issue.status !== "resolved" ? (
                            <span className="text-xs text-muted-foreground">{remaining}h remaining</span>
                          ) : null}
                        </div>
                      </Link>
                      <div className="flex gap-2">
                        {issue.status === "open" && (
                          <Button size="sm" variant="outline" className="hover:bg-primary/10" onClick={() => updateStatus(issue.id, "in_progress")}>
                            Start Work
                          </Button>
                        )}
                        {(issue.status === "in_progress" || issue.status === "open") && (
                          <Button size="sm" className="bg-gradient-to-r from-secondary to-primary hover:opacity-90 text-white" onClick={() => updateStatus(issue.id, "resolved")}>
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

const GradientStatCard = ({ icon, label, value, gradient }: { icon: React.ReactNode; label: string; value: any; gradient: string }) => (
  <Card className="group hover:shadow-xl hover:scale-105 transition-all duration-300 overflow-hidden">
    <CardContent className="p-4 flex items-center gap-4">
      <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </CardContent>
  </Card>
);

export default AuthorityDashboard;
