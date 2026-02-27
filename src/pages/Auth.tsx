import { useState, useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Shield, MapPin, Users, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const { user, role, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const seeded = useRef(false);

  useEffect(() => {
    if (!seeded.current) {
      seeded.current = true;
      supabase.functions.invoke("seed-admin").catch(() => {});
    }
  }, []);

  if (!loading && user && role) {
    const redirectMap: Record<string, string> = {
      citizen: "/citizen",
      authority: "/authority",
      admin: "/admin",
    };
    return <Navigate to={redirectMap[role] || "/citizen"} replace />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-secondary to-primary flex-col justify-center items-center p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="max-w-md space-y-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm shadow-xl">
              <Shield className="h-10 w-10" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">ResolvIt</h1>
          </div>
          <p className="text-xl opacity-90">
            From complaints to accountability — turning public voices into measurable action.
          </p>
          <div className="space-y-4 pt-6">
            <Feature icon={<MapPin className="h-5 w-5" />} text="Report civic issues with precise location mapping" />
            <Feature icon={<Users className="h-5 w-5" />} text="Track resolution progress in real-time" />
            <Feature icon={<Shield className="h-5 w-5" />} text="AI-powered priority scoring and duplicate detection" />
          </div>
        </div>
      </div>

      {/* Right panel - auth forms */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md shadow-2xl hover:shadow-3xl transition-shadow duration-500">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 lg:hidden mb-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-secondary">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">ResolvIt</span>
            </div>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Sign in to your account or create a new one</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                <TabsTrigger value="authority">Authority</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <LoginForm isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} />
              </TabsContent>
              <TabsContent value="signup">
                <SignupForm isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} />
              </TabsContent>
              <TabsContent value="authority">
                <AuthorityLoginForm isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} />
              </TabsContent>
            </Tabs>

            {/* Admin Quick Login */}
            <div className="mt-4 pt-4 border-t border-border">
              <AdminQuickLogin isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const AdminQuickLogin = ({ isSubmitting, setIsSubmitting }: { isSubmitting: boolean; setIsSubmitting: (v: boolean) => void }) => {
  const { signIn } = useAuth();

  const handleAdminLogin = async () => {
    setIsSubmitting(true);
    const { error } = await signIn("admin@resolvit.com", "admin123456");
    if (error) {
      toast({ title: "Admin login failed", description: error.message, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  return (
    <Button
      variant="outline"
      className="w-full gap-2 border-dashed"
      onClick={handleAdminLogin}
      disabled={isSubmitting}
    >
      <KeyRound className="h-4 w-4" />
      {isSubmitting ? "Signing in..." : "Quick Admin Login"}
    </Button>
  );
};

const Feature = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div className="flex items-center gap-3 opacity-90 hover:opacity-100 hover:translate-x-2 transition-all duration-300">
    <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm">{icon}</div>
    <span>{text}</span>
  </div>
);

const LoginForm = ({ isSubmitting, setIsSubmitting }: { isSubmitting: boolean; setIsSubmitting: (v: boolean) => void }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="transition-all duration-200 focus:scale-[1.01]" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        <Input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="transition-all duration-200 focus:scale-[1.01]" />
      </div>
      <Button type="submit" className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
};

const SignupForm = ({ isSubmitting, setIsSubmitting }: { isSubmitting: boolean; setIsSubmitting: (v: boolean) => void }) => {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Must be at least 6 characters", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const { error } = await signUp(email, password, name);
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "We sent you a confirmation link." });
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label htmlFor="signup-name">Full Name</Label>
        <Input id="signup-name" value={name} onChange={e => setName(e.target.value)} required className="transition-all duration-200 focus:scale-[1.01]" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input id="signup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="transition-all duration-200 focus:scale-[1.01]" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input id="signup-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="transition-all duration-200 focus:scale-[1.01]" />
      </div>
      <Button type="submit" className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300" disabled={isSubmitting}>
        {isSubmitting ? "Creating account..." : "Create Account"}
      </Button>
    </form>
  );
};

const AuthorityLoginForm = ({ isSubmitting, setIsSubmitting }: { isSubmitting: boolean; setIsSubmitting: (v: boolean) => void }) => {
  const { authorityLogin } = useAuth();
  const [mobile, setMobile] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [mobileError, setMobileError] = useState("");
  const [aadhaarError, setAadhaarError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMobileError("");
    setAadhaarError("");

    // Validate
    const cleanMobile = mobile.replace(/\D/g, "");
    const cleanAadhaar = aadhaar.replace(/\D/g, "");

    if (!/^\d{10}$/.test(cleanMobile)) {
      setMobileError("Must be exactly 10 digits");
      return;
    }
    if (!/^\d{12}$/.test(cleanAadhaar)) {
      setAadhaarError("Must be exactly 12 digits");
      return;
    }

    setIsSubmitting(true);
    const { error } = await authorityLogin(cleanMobile, cleanAadhaar);
    if (error) {
      toast({ title: "Login failed", description: error.message || "Invalid credentials", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground mb-2">
        Authority login is for government officials only. Accounts are created by administrators.
      </div>
      <div className="space-y-2">
        <Label htmlFor="auth-mobile">Mobile Number</Label>
        <Input
          id="auth-mobile"
          type="tel"
          placeholder="10-digit mobile number"
          value={mobile}
          onChange={e => {
            setMobile(e.target.value.replace(/\D/g, "").slice(0, 10));
            setMobileError("");
          }}
          required
          maxLength={10}
          className="transition-all duration-200 focus:scale-[1.01]"
        />
        {mobileError && <p className="text-xs text-destructive">{mobileError}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="auth-aadhaar">Aadhaar Number</Label>
        <Input
          id="auth-aadhaar"
          type="password"
          placeholder="12-digit Aadhaar number"
          value={aadhaar}
          onChange={e => {
            setAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12));
            setAadhaarError("");
          }}
          required
          maxLength={12}
          className="transition-all duration-200 focus:scale-[1.01]"
        />
        {aadhaarError && <p className="text-xs text-destructive">{aadhaarError}</p>}
      </div>
      <Button type="submit" className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300" disabled={isSubmitting}>
        {isSubmitting ? "Verifying..." : "Authority Sign In"}
      </Button>
    </form>
  );
};

export default Auth;
