import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { UserPlus, Shield, Phone, CreditCard } from "lucide-react";

const ManageAuthorities = () => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [authorities, setAuthorities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [deptId, setDeptId] = useState("");

  useEffect(() => {
    supabase.from("departments").select("*").then(({ data }) => {
      if (data) setDepartments(data);
    });
    fetchAuthorities();
  }, []);

  const fetchAuthorities = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_roles")
      .select("user_id, department_id, role")
      .eq("role", "authority");

    if (data && data.length > 0) {
      const userIds = data.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, mobile_number")
        .in("id", userIds);

      const merged = data.map((r) => ({
        ...r,
        profile: profiles?.find((p) => p.id === r.user_id),
      }));
      setAuthorities(merged);
    } else {
      setAuthorities([]);
    }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^\d{10}$/.test(mobile)) {
      toast({ title: "Invalid mobile", description: "Must be exactly 10 digits", variant: "destructive" });
      return;
    }
    if (!/^\d{12}$/.test(aadhaar)) {
      toast({ title: "Invalid Aadhaar", description: "Must be exactly 12 digits", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (!deptId) {
      toast({ title: "Select department", variant: "destructive" });
      return;
    }

    setFormLoading(true);
    const { data, error } = await supabase.functions.invoke("create-authority", {
      body: { name, email, password, mobile_number: mobile, aadhaar_number: aadhaar, department_id: deptId },
    });

    if (error || data?.error) {
      toast({ title: "Failed", description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: "Authority account created successfully!" });
      setName(""); setEmail(""); setPassword(""); setMobile(""); setAadhaar(""); setDeptId("");
      fetchAuthorities();
    }
    setFormLoading(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Manage Authorities</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Create Authority Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="auth-name">Full Name</Label>
                <Input id="auth-name" value={name} onChange={e => setName(e.target.value)} required placeholder="Officer name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-email">Email</Label>
                <Input id="auth-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="officer@gov.in" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-pwd">Password</Label>
                <Input id="auth-pwd" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 6 characters" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-mob" className="flex items-center gap-1"><Phone className="h-3 w-3" /> Mobile Number</Label>
                <Input id="auth-mob" type="tel" value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} required placeholder="10-digit mobile" maxLength={10} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-aadh" className="flex items-center gap-1"><CreditCard className="h-3 w-3" /> Aadhaar Number</Label>
                <Input id="auth-aadh" type="password" value={aadhaar} onChange={e => setAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))} required placeholder="12-digit Aadhaar" maxLength={12} />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={deptId} onValueChange={setDeptId}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={formLoading} className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white">
                  {formLoading ? "Creating..." : "Create Authority Account"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Existing Authorities</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : authorities.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No authority accounts yet.</p>
            ) : (
              <div className="space-y-2">
                {authorities.map((a) => (
                  <div key={a.user_id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium">{a.profile?.name || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">
                        {a.profile?.mobile_number ? `📱 ${a.profile.mobile_number}` : "No mobile"} •{" "}
                        {departments.find(d => d.id === a.department_id)?.name || "No dept"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ManageAuthorities;
