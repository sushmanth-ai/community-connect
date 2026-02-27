import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy } from "lucide-react";

const AdminLeaderboard = () => {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("profiles").select("id, name, points_total").order("points_total", { ascending: false }).limit(20).then(({ data }) => {
      setLeaders(data || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <AppLayout><p className="text-muted-foreground">Loading...</p></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-primary bg-clip-text text-transparent flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" /> Top Citizens
        </h1>

        <Card className="hover:shadow-lg transition-shadow">
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
                  <TableRow key={l.id} className="hover:bg-primary/5 transition-colors group">
                    <TableCell className="font-bold text-lg">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </TableCell>
                    <TableCell className="font-medium group-hover:text-primary transition-colors">{l.name}</TableCell>
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

export default AdminLeaderboard;
