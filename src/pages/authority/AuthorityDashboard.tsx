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
import { AcceptIssueDialog } from "@/components/issues/AcceptIssueDialog";
import { DeclineIssueDialog } from "@/components/issues/DeclineIssueDialog";
import { ProgressUpdateDialog } from "@/components/issues/ProgressUpdateDialog";

const AuthorityDashboard = () => {
  const { departmentId, mandalId, role } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
  const [workDetails, setWorkDetails] = useState<Record<string, any>>({});
  const [filter, setFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [departments, setDepartments] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, resolved: 0, escalated: 0, avgTime: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState("");

  const isAdmin = role === "admin";
  const effectiveDeptId = isAdmin ? (deptFilter !== "all" ? deptFilter : null) : departmentId;
  const effectiveMandalId = isAdmin ? null : mandalId;

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
      if (effectiveMandalId) query = query.eq("mandal_id", effectiveMandalId);
      if (filter !== "all") query = query.eq("status", filter as any);
      const { data } = await query;
      const issuesList = data || [];
      setIssues(issuesList);

      // Fetch work details for all issues
      if (issuesList.length > 0) {
        const ids = issuesList.map(i => i.id);
        const { data: wd } = await supabase.from("issue_work_details" as any).select("*").in("issue_id", ids);
        const map: Record<string, any> = {};
        (wd || []).forEach((w: any) => { map[w.issue_id] = w; });
        setWorkDetails(map);
      }

      // Stats
      let statsQuery = supabase.from("issues").select("*");
      if (effectiveDeptId) statsQuery = statsQuery.eq("department_id", effectiveDeptId);
      if (effectiveMandalId) statsQuery = statsQuery.eq("mandal_id", effectiveMandalId);
      const { data: allData } = await statsQuery;
      if (allData) {
        const resolved = allData.filter((i) => i.status === "resolved" || i.status === "completed");
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
  }, [effectiveDeptId, effectiveMandalId, filter, refreshKey]);

  useEffect(() => {
    const channelFilter = effectiveDeptId
      ? { event: '*' as const, schema: 'public', table: 'issues', filter: `department_id=eq.${effectiveDeptId}` }
      : { event: '*' as const, schema: 'public', table: 'issues' };
    const channel = supabase.channel('authority-dashboard-realtime')
      .on('postgres_changes', channelFilter, () => setRefreshKey((k) => k + 1))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [effectiveDeptId]);

  const sla = effectiveDeptId ? (departments.find((d) => d.id === effectiveDeptId)?.sla_hours || 48) : 48;
  const refresh = () => setRefreshKey((k) => k + 1);

  const handleStartWork = async (issueId: string) => {
    const { error } = await supabase.from("issues").update({ status: "work_started" as any }).eq("id", issueId);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Work started" }); refresh(); }
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
                {departments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
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
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="work_started">Work Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
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
              const isOverdue = remaining <= 0 && !["resolved", "completed", "declined", "cancelled"].includes(issue.status);
              const wd = workDetails[issue.id];

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
                          {wd && wd.progress_percentage > 0 && (
                            <span className="text-xs font-medium text-primary">{wd.progress_percentage}% done</span>
                          )}
                          {isOverdue ? (
                            <span className="text-xs text-destructive font-medium">⚠ SLA Overdue by {Math.abs(remaining)}h</span>
                          ) : !["resolved", "completed", "declined", "cancelled"].includes(issue.status) ? (
                            <span className="text-xs text-muted-foreground">{remaining}h remaining</span>
                          ) : null}
                        </div>
                      </Link>
                      <div className="flex gap-2 flex-wrap">
                        {issue.status === "open" && (
                          <>
                            <Button size="sm" onClick={() => { setSelectedIssueId(issue.id); setAcceptDialogOpen(true); }}>Accept</Button>
                            <Button size="sm" variant="destructive" onClick={() => { setSelectedIssueId(issue.id); setDeclineDialogOpen(true); }}>Decline</Button>
                          </>
                        )}
                        {issue.status === "accepted" && (
                          <Button size="sm" variant="outline" onClick={() => handleStartWork(issue.id)}>Start Work</Button>
                        )}
                        {(issue.status === "work_started" || issue.status === "accepted") && wd && (
                          <Button size="sm" variant="secondary" onClick={() => { setSelectedIssueId(issue.id); setProgressDialogOpen(true); }}>Update Progress</Button>
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

      <AcceptIssueDialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen} issueId={selectedIssueId} onSuccess={refresh} />
      <DeclineIssueDialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen} issueId={selectedIssueId} onSuccess={refresh} />
      {progressDialogOpen && workDetails[selectedIssueId] && (
        <ProgressUpdateDialog
          open={progressDialogOpen}
          onOpenChange={setProgressDialogOpen}
          issueId={selectedIssueId}
          currentProgress={workDetails[selectedIssueId]?.progress_percentage || 0}
          budgetAllocated={workDetails[selectedIssueId]?.budget_allocated || 0}
          onSuccess={refresh}
        />
      )}
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
