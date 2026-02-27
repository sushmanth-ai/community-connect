import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IssueMap } from "@/components/map/IssueMap";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/issues/StatusBadge";
import { PriorityBadge } from "@/components/issues/PriorityBadge";
import { BarChart3, CheckCircle, AlertTriangle, Clock, TrendingUp, Users } from "lucide-react";
import { differenceInHours } from "date-fns";

const AdminDashboard = () => {
  const [issues, setIssues] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [issuesRes, deptsRes, leadersRes] = await Promise.all([
        supabase.from("issues").select("*").order("priority_score", { ascending: false }),
        supabase.from("departments").select("*"),
        supabase.from("profiles").select("id, name, points_total").order("points_total", { ascending: false }).limit(10),
      ]);
      if (issuesRes.data) setIssues(issuesRes.data);
      if (deptsRes.data) setDepartments(deptsRes.data);
      if (leadersRes.data) setLeaders(leadersRes.data);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const totalIssues = issues.length;
  const resolved = issues.filter((i) => i.status === "resolved");
  const escalated = issues.filter((i) => i.status === "escalated");
  const resolvedPct = totalIssues > 0 ? Math.round((resolved.length / totalIssues) * 100) : 0;
  const avgResTime = resolved.length > 0
    ? Math.round(resolved.reduce((s, i) => s + differenceInHours(new Date(i.updated_at), new Date(i.created_at)), 0) / resolved.length)
    : 0;
  const escalationRate = totalIssues > 0 ? Math.round((escalated.length / totalIssues) * 100) : 0;

  const deptStats = departments.map((d) => {
    const dIssues = issues.filter((i) => i.department_id === d.id);
    const dResolved = dIssues.filter((i) => i.status === "resolved");
    const avgTime = dResolved.length > 0
      ? Math.round(dResolved.reduce((s, i) => s + differenceInHours(new Date(i.updated_at), new Date(i.created_at)), 0) / dResolved.length)
      : 0;
    const slaCompliance = dIssues.length > 0
      ? Math.round((dIssues.filter((i) => i.status !== "escalated").length / dIssues.length) * 100)
      : 100;
    return { ...d, total: dIssues.length, resolved: dResolved.length, avgTime, slaCompliance };
  });

  if (loading) return <AppLayout><p className="text-muted-foreground">Loading...</p></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard icon={<BarChart3 />} label="Total Issues" value={totalIssues} />
          <StatCard icon={<CheckCircle />} label="Resolved %" value={`${resolvedPct}%`} />
          <StatCard icon={<Clock />} label="Avg Resolution" value={`${avgResTime}h`} />
          <StatCard icon={<AlertTriangle />} label="Escalation Rate" value={`${escalationRate}%`} />
          <StatCard icon={<Users />} label="Active Citizens" value={leaders.length} />
        </div>

        {/* Map */}
        <Card>
          <CardHeader><CardTitle>Issue Map</CardTitle></CardHeader>
          <CardContent>
            <IssueMap issues={issues} height="400px" showHeatmap />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Department Performance */}
          <Card>
            <CardHeader><CardTitle>Department Performance</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Issues</TableHead>
                    <TableHead className="text-right">Resolved</TableHead>
                    <TableHead className="text-right">Avg Time</TableHead>
                    <TableHead className="text-right">SLA %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deptStats.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-right">{d.total}</TableCell>
                      <TableCell className="text-right">{d.resolved}</TableCell>
                      <TableCell className="text-right">{d.avgTime}h</TableCell>
                      <TableCell className="text-right">{d.slaCompliance}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Escalated Issues */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-critical" /> Escalated Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              {escalated.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No escalated issues 🎉</p>
              ) : (
                <div className="space-y-3">
                  {escalated.slice(0, 10).map((issue) => (
                    <div key={issue.id} className="flex items-center justify-between p-3 rounded-lg bg-critical/5 border border-critical/20">
                      <div>
                        <p className="font-medium text-sm">{issue.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{issue.category.replace("_", " ")}</p>
                      </div>
                      <PriorityBadge score={issue.priority_score} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard */}
        <Card>
          <CardHeader><CardTitle>Top Citizens</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaders.map((l, i) => (
                  <TableRow key={l.id}>
                    <TableCell>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</TableCell>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="text-right font-semibold">{l.points_total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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

export default AdminDashboard;
