import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { UserPlus, Shield, Search, Copy, KeyRound, Ban, Mail, MailX, RefreshCw } from "lucide-react";
import { format } from "date-fns";

const ManageAuthorities = () => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [mandals, setMandals] = useState<any[]>([]);
  const [authorities, setAuthorities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [govId, setGovId] = useState("");
  const [mandalId, setMandalId] = useState("");
  const [deptId, setDeptId] = useState("");
  const [activeToggle, setActiveToggle] = useState(true);

  // Credentials dialog
  const [credentialsDialog, setCredentialsDialog] = useState(false);
  const [credentials, setCredentials] = useState<{
    email: string;
    password: string;
    email_sent: boolean;
    mandal_name: string;
    dept_name: string;
  } | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("departments").select("*").order("name"),
      supabase.from("mandals").select("*").eq("district", "Nellore").eq("status", "active").order("name"),
    ]).then(([deptRes, mandalRes]) => {
      if (deptRes.data) setDepartments(deptRes.data);
      if (mandalRes.data) setMandals(mandalRes.data);
    });
    fetchAuthorities();
  }, []);

  const fetchAuthorities = async () => {
    setLoading(true);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, department_id")
      .eq("role", "authority");

    if (roles && roles.length > 0) {
      const userIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, mobile_number, mandal_id, gov_id, active_status, last_login")
        .in("id", userIds);

      const { data: allMandals } = await supabase.from("mandals").select("id, name");

      const merged = roles.map((r) => {
        const prof = profiles?.find((p) => p.id === r.user_id);
        return {
          ...r,
          profile: prof,
          mandal_name: allMandals?.find((m) => m.id === (prof as any)?.mandal_id)?.name || "—",
          dept_name: departments.find((d) => d.id === r.department_id)?.name || "—",
        };
      });
      setAuthorities(merged);
    } else {
      setAuthorities([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (departments.length > 0) fetchAuthorities();
  }, [departments]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mandalId) { toast({ title: "Select mandal", variant: "destructive" }); return; }
    if (!deptId) { toast({ title: "Select department", variant: "destructive" }); return; }
    if (!name || !email) { toast({ title: "Name and email are required", variant: "destructive" }); return; }

    setFormLoading(true);
    const { data, error } = await supabase.functions.invoke("create-authority", {
      body: { name, email, phone, gov_id: govId, mandal_id: mandalId, department_id: deptId, active_status: activeToggle },
    });

    if (error || data?.error) {
      toast({ title: "Failed", description: data?.error || error?.message, variant: "destructive" });
    } else {
      setCredentials({
        email: data.email,
        password: data.generated_password,
        email_sent: data.email_sent ?? false,
        mandal_name: data.mandal_name || "",
        dept_name: data.dept_name || "",
      });
      setCredentialsDialog(true);
      if (data.email_sent) {
        toast({ title: "✅ Credentials emailed", description: `Login details sent to ${data.email}` });
      } else {
        toast({ title: "⚠️ Email not sent", description: "Please share credentials manually or retry.", variant: "destructive" });
      }
      setName(""); setEmail(""); setPhone(""); setGovId(""); setMandalId(""); setDeptId("");
      fetchAuthorities();
    }
    setFormLoading(false);
  };

  const handleResendEmail = async () => {
    if (!credentials) return;
    setResending(true);
    const { data, error } = await supabase.functions.invoke("create-authority", {
      body: {
        _action: "resend_email",
        email: credentials.email,
        password: credentials.password,
        name: "Authority",
        mandal_name: credentials.mandal_name,
        dept_name: credentials.dept_name,
        login_url: `${window.location.origin}/auth`,
      },
    });
    if (data?.email_sent) {
      setCredentials({ ...credentials, email_sent: true });
      toast({ title: "✅ Email sent successfully!" });
    } else {
      toast({ title: "Failed to send email", variant: "destructive" });
    }
    setResending(false);
  };

  const handleDeactivate = async (userId: string, currentStatus: boolean) => {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ active_status: !currentStatus } as any)
      .eq("id", userId);
    if (updateError) {
      toast({ title: "Failed", description: updateError.message, variant: "destructive" });
    } else {
      toast({ title: currentStatus ? "Authority deactivated" : "Authority activated" });
      fetchAuthorities();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!" });
  };

  const filteredAuthorities = authorities.filter((a) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      a.profile?.name?.toLowerCase().includes(term) ||
      a.mandal_name?.toLowerCase().includes(term) ||
      a.dept_name?.toLowerCase().includes(term)
    );
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Manage Authorities</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Assign Authority</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mandal</Label>
                <Select value={mandalId} onValueChange={setMandalId}>
                  <SelectTrigger><SelectValue placeholder="Select Mandal" /></SelectTrigger>
                  <SelectContent>
                    {mandals.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={deptId} onValueChange={setDeptId}>
                  <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Officer name" />
              </div>
              <div className="space-y-2">
                <Label>Official Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="officer@gov.in" />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit phone" maxLength={10} />
              </div>
              <div className="space-y-2">
                <Label>Government ID</Label>
                <Input value={govId} onChange={(e) => setGovId(e.target.value)} placeholder="Gov ID (optional)" />
              </div>
              <div className="flex items-center gap-3 md:col-span-2">
                <Switch checked={activeToggle} onCheckedChange={setActiveToggle} />
                <Label>Active Status</Label>
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={formLoading} className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white">
                  <KeyRound className="h-4 w-4 mr-2" />
                  {formLoading ? "Creating..." : "Assign Authority (Auto-generate Password)"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Credentials Dialog */}
        <Dialog open={credentialsDialog} onOpenChange={setCredentialsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Authority Credentials Created</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Email status banner */}
              {credentials?.email_sent ? (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg p-3 text-sm">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span>Credentials emailed to <strong>{credentials.email}</strong></span>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <MailX className="h-4 w-4 shrink-0" />
                    <span>Email delivery failed. Share credentials manually or retry.</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleResendEmail} disabled={resending} className="shrink-0">
                    <RefreshCw className={`h-3 w-3 mr-1 ${resending ? "animate-spin" : ""}`} />
                    {resending ? "Sending..." : "Retry"}
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Label>Email</Label>
                <div className="flex gap-2">
                  <Input readOnly value={credentials?.email || ""} />
                  <Button size="icon" variant="outline" onClick={() => copyToClipboard(credentials?.email || "")}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Generated Password</Label>
                <div className="flex gap-2">
                  <Input readOnly value={credentials?.password || ""} className="font-mono" />
                  <Button size="icon" variant="outline" onClick={() => copyToClipboard(credentials?.password || "")}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
              <Button className="w-full" variant="outline" onClick={() => {
                const text = `ResolvIt Authority Login Credentials\n\nEmail: ${credentials?.email}\nPassword: ${credentials?.password}\n\nLogin URL: ${window.location.origin}/auth`;
                copyToClipboard(text);
              }}>
                <Copy className="h-4 w-4 mr-2" /> Copy All Credentials
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Management Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Authority Management</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search mandal or department..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : filteredAuthorities.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No authority accounts found.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mandal</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAuthorities.map((a) => (
                      <TableRow key={a.user_id}>
                        <TableCell>{a.mandal_name}</TableCell>
                        <TableCell>{a.dept_name}</TableCell>
                        <TableCell className="font-medium">{a.profile?.name || "—"}</TableCell>
                        <TableCell>{a.profile?.mobile_number || "—"}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${(a.profile as any)?.active_status !== false ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                            {(a.profile as any)?.active_status !== false ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {(a.profile as any)?.last_login ? format(new Date((a.profile as any).last_login), "dd/MM/yy HH:mm") : "Never"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleDeactivate(a.user_id, (a.profile as any)?.active_status !== false)}>
                              <Ban className="h-3 w-3 mr-1" />
                              {(a.profile as any)?.active_status !== false ? "Deactivate" : "Activate"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ManageAuthorities;
