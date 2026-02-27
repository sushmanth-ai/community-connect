import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { Button } from "@/components/ui/button";
import { Shield, Menu, X, Home, PlusCircle, List, Trophy, LogOut, BarChart3, Users, AlertTriangle, Map, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const citizenNav: NavItem[] = [
  { label: "Dashboard", href: "/citizen", icon: <Home className="h-4 w-4" /> },
  { label: "Submit Issue", href: "/citizen/submit", icon: <PlusCircle className="h-4 w-4" /> },
  { label: "My Issues", href: "/citizen/issues", icon: <List className="h-4 w-4" /> },
  { label: "Leaderboard", href: "/citizen/leaderboard", icon: <Trophy className="h-4 w-4" /> },
];

const authorityNav: NavItem[] = [
  { label: "Dashboard", href: "/authority", icon: <Home className="h-4 w-4" /> },
  { label: "Issue Queue", href: "/authority/queue", icon: <List className="h-4 w-4" /> },
  { label: "Performance", href: "/authority/stats", icon: <BarChart3 className="h-4 w-4" /> },
];

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: <Home className="h-4 w-4" /> },
  { label: "Map View", href: "/admin/map", icon: <Map className="h-4 w-4" /> },
  { label: "Departments", href: "/admin/departments", icon: <Users className="h-4 w-4" /> },
  { label: "Authorities", href: "/admin/authorities", icon: <Shield className="h-4 w-4" /> },
  { label: "Escalations", href: "/admin/escalations", icon: <AlertTriangle className="h-4 w-4" /> },
  { label: "Leaderboard", href: "/admin/leaderboard", icon: <Trophy className="h-4 w-4" /> },
];

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { role, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = role === "admin" ? adminNav : role === "authority" ? authorityNav : citizenNav;

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-sidebar to-sidebar/95 text-sidebar-foreground transform transition-transform duration-300 lg:translate-x-0 lg:static shadow-2xl",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 p-6 border-b border-sidebar-border">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-secondary">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold">ResolvIt</span>
            <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                  location.pathname === item.href
                    ? "bg-gradient-to-r from-primary/20 to-secondary/10 text-sidebar-primary font-medium shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground hover:translate-x-1"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-medium shadow-lg">
                {profile?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.name || "User"}</p>
                <p className="text-xs text-sidebar-foreground/50 capitalize">{role}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-destructive/20"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b px-4 py-3 flex items-center gap-4 shadow-sm">
          <button className="lg:hidden hover:bg-muted rounded-lg p-2 transition-colors" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <NotificationBell />
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};
