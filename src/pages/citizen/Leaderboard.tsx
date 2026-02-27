import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Award } from "lucide-react";

const Leaderboard = () => {
  const { user, profile } = useAuth();
  const [leaders, setLeaders] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, points_total, avatar_url")
        .order("points_total", { ascending: false })
        .limit(10);
      if (data) setLeaders(data);
    };
    fetch();
  }, []);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-warning" /> Civic Leaderboard
        </h1>

        {profile && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-4">
              <Award className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Your Points: {profile.points_total}</p>
                <p className="text-sm text-muted-foreground">Keep reporting issues to earn more!</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Top 10 Citizens</CardTitle></CardHeader>
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
                {leaders.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No data yet</TableCell></TableRow>
                ) : (
                  leaders.map((l, i) => (
                    <TableRow key={l.id} className={l.id === user?.id ? "bg-primary/5" : ""}>
                      <TableCell className="font-bold">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                      </TableCell>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell className="text-right font-semibold">{l.points_total}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Leaderboard;
