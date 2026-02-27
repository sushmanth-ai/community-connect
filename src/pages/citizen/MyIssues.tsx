import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { IssueCard } from "@/components/issues/IssueCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MyIssues = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchIssues = async () => {
      let query = supabase.from("issues").select("*").eq("reporter_id", user.id).order("created_at", { ascending: false });
      if (filter !== "all") query = query.eq("status", filter as any);
      const { data } = await query;
      setIssues(data || []);
      setLoading(false);
    };
    fetchIssues();
  }, [user, filter]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Issues</h1>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {loading ? (
          <p className="text-muted-foreground">Loading issues...</p>
        ) : issues.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No issues found.</p>
        ) : (
          <div className="space-y-3">{issues.map((i) => <IssueCard key={i.id} issue={i} />)}</div>
        )}
      </div>
    </AppLayout>
  );
};

export default MyIssues;
