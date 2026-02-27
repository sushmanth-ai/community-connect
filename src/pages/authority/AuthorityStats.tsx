import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { differenceInHours } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const COLORS = ["hsl(210, 70%, 55%)", "hsl(38, 92%, 50%)", "hsl(152, 60%, 40%)", "hsl(0, 72%, 51%)"];

const AuthorityStats = () => {
  const { departmentId, role } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [departments, setDepartments] = useState<any[]>([]);
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
      let query = supabase.from("issues").select("*");
      if (effectiveDeptId) query = query.eq("department_id", effectiveDeptId);
      const { data } = await query;
      setIssues(data || []);
      setLoading(false);
    };
    fetchIssues();
  }, [effectiveDeptId]);

  const resolved = issues.filter((i) => i.status === "resolved");
  const open = issues.filter((i) => i.status === "open");
  const inProgress = issues.filter((i) => i.status === "in_progress");
  const escalated = issues.filter((i) => i.status === "escalated");

  const avgTime = resolved.length > 0
    ? Math.round(resolved.reduce((s, i) => s + differenceInHours(new Date(i.updated_at), new Date(i.created_at)), 0) / resolved.length)
    : 0;

  const resolutionRate = issues.length > 0 ? Math.round((resolved.length / issues.length) * 100) : 0;

  const statusData = [
    { name: "Open", value: open.length },
    { name: "In Progress", value: inProgress.length },
    { name: "Resolved", value: resolved.length },
    { name: "Escalated", value: escalated.length },
  ].filter((d) => d.value > 0);

  const categoryData = Object.entries(
    issues.reduce((acc: Record<string, number>, i) => {
      acc[i.category] = (acc[i.category] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: name.replace("_", " "), value }));

  if (loading) return <AppLayout><p className="text-muted-foreground">Loading...</p></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Performance Stats</h1>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <GradientStatCard icon={<BarChart3 />} label="Total Issues" value={issues.length} gradient="from-blue-500 to-cyan-400" />
          <GradientStatCard icon={<CheckCircle />} label="Resolution Rate" value={`${resolutionRate}%`} gradient="from-emerald-500 to-green-400" />
          <GradientStatCard icon={<Clock />} label="Avg Resolution" value={`${avgTime}h`} gradient="from-amber-500 to-yellow-400" />
          <GradientStatCard icon={<AlertTriangle />} label="Escalated" value={escalated.length} gradient="from-red-500 to-rose-400" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader><CardTitle>Status Distribution</CardTitle></CardHeader>
            <CardContent>
              {statusData.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                      {statusData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader><CardTitle>Issues by Category</CardTitle></CardHeader>
            <CardContent>
              {categoryData.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(210, 70%, 55%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

const GradientStatCard = ({ icon, label, value, gradient }: { icon: React.ReactNode; label: string; value: any; gradient: string }) => (
  <Card className="group hover:shadow-xl hover:scale-105 transition-all duration-300 overflow-hidden">
    <CardContent className="p-4 flex items-center gap-4 relative">
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

export default AuthorityStats;
