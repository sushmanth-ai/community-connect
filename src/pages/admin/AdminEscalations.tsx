import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge } from "@/components/issues/PriorityBadge";
import { AlertTriangle, Clock } from "lucide-react";
import { differenceInHours, formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

const AdminEscalations = () => {
  const [escalated, setEscalated] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("issues").select("*").eq("status", "escalated").order("priority_score", { ascending: false }),
      supabase.from("departments").select("*"),
    ]).then(([issuesRes, deptsRes]) => {
      setEscalated(issuesRes.data || []);
      setDepartments(deptsRes.data || []);
      setLoading(false);
    });
  }, []);

  const getDeptName = (id: string | null) => departments.find((d) => d.id === id)?.name || "Unassigned";

  if (loading) return <AppLayout><p className="text-muted-foreground">Loading...</p></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-destructive to-amber-500 bg-clip-text text-transparent flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-destructive" /> Escalated Issues
        </h1>

        {escalated.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-2xl">🎉</p>
              <p className="text-muted-foreground mt-2">No escalated issues! Everything is under control.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {escalated.map((issue) => {
              const hoursOverdue = differenceInHours(new Date(), new Date(issue.created_at));
              return (
                <Link key={issue.id} to={`/admin/issues/${issue.id}`}>
                  <Card className="group hover:shadow-xl hover:scale-[1.01] transition-all duration-300 border-l-4 border-l-destructive bg-gradient-to-r from-destructive/5 to-transparent">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-medium group-hover:text-destructive transition-colors">{issue.title}</h3>
                          <p className="text-sm text-muted-foreground capitalize mt-1">{issue.category.replace("_", " ")}</p>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <PriorityBadge score={issue.priority_score} />
                            <span className="text-xs text-muted-foreground">{getDeptName(issue.department_id)}</span>
                            <span className="text-xs text-destructive font-medium flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Overdue {hoursOverdue}h
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminEscalations;
