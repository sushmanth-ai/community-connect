import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IssueCard } from "@/components/issues/IssueCard";
import { AlertTriangle, CheckCircle, Clock, TrendingUp, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

const CitizenDashboard = () => {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ total: 0, resolved: 0, inProgress: 0, escalated: 0 });
  const [recentIssues, setRecentIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [allRes, recentRes] = await Promise.all([
        supabase.from("issues").select("status").eq("reporter_id", user.id),
        supabase.from("issues").select("*").eq("reporter_id", user.id).order("created_at", { ascending: false }).limit(5),
      ]);

      if (allRes.data) {
        setStats({
          total: allRes.data.length,
          resolved: allRes.data.filter((i) => i.status === "resolved").length,
          inProgress: allRes.data.filter((i) => i.status === "in_progress").length,
          escalated: allRes.data.filter((i) => i.status === "escalated").length,
        });
      }
      if (recentRes.data) setRecentIssues(recentRes.data);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {profile?.name || "Citizen"}</h1>
            <p className="text-muted-foreground">Your civic dashboard</p>
          </div>
          <Link to="/citizen/submit">
            <Button><PlusCircle className="h-4 w-4 mr-2" />Report Issue</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Clock />} label="Total Issues" value={stats.total} color="text-info" />
          <StatCard icon={<TrendingUp />} label="In Progress" value={stats.inProgress} color="text-warning" />
          <StatCard icon={<CheckCircle />} label="Resolved" value={stats.resolved} color="text-success" />
          <StatCard icon={<Award />} label="Civic Points" value={profile?.points_total || 0} color="text-primary" />
        </div>

        {stats.escalated > 0 && (
          <Card className="border-critical/50 bg-critical/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-critical" />
              <span className="text-sm font-medium">{stats.escalated} of your issues have been escalated</span>
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Issues</h2>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : recentIssues.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              No issues reported yet. <Link to="/citizen/submit" className="text-primary underline">Submit your first issue</Link>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {recentIssues.map((issue) => <IssueCard key={issue.id} issue={issue} linkPrefix="/citizen" />)}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-4">
      <div className={`${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </CardContent>
  </Card>
);

export default CitizenDashboard;
