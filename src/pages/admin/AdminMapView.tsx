import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IssueMap } from "@/components/map/IssueMap";

const AdminMapView = () => {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("issues").select("*").order("priority_score", { ascending: false }).then(({ data }) => {
      setIssues(data || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <AppLayout><p className="text-muted-foreground">Loading...</p></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Issue Map</h1>
        <Card className="hover:shadow-lg transition-shadow overflow-hidden">
          <CardContent className="p-0">
            <IssueMap issues={issues} height="600px" showHeatmap />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AdminMapView;
