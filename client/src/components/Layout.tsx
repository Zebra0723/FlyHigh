import { Link, useLocation } from "wouter";
import { Trophy, BookOpen, Layers, Home, Settings, Menu, X, Images, Send, Sun, Moon, User, LogOut } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/rankings", label: "Rankings", icon: Trophy },
  { href: "/my-table", label: "My Table", icon: User },
  { href: "/planes", label: "Planes", icon: Layers },
  { href: "/tutorials", label: "Tutorials", icon: BookOpen },
  { href: "/gallery", label: "Gallery", icon: Images },
  { href: "/submit", label: "Submit", icon: Send },
];

function PlaneLogo() {
  return (
    <svg aria-label="FlyHigh" viewBox="0 0 40 40" fill="none" width="32" height="32" className="flex-shrink-0">
      <path d="M4 20 L36 6 L22 36 L18 24 Z" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinejoin="round" fill="hsl(var(--primary) / 0.15)" />
      <path d="M18 24 L36 6" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeDasharray="2 2" />
      <circle cx="36" cy="6" r="2" fill="hsl(var(--accent))" />
    </svg>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    await logout();
    toast({ title: "Signed out" });
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-50 border-b border-border/60 backdrop-blur-md bg-background/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <PlaneLogo />
            <div className="leading-none">
              <div className="font-display font-900 text-sm tracking-tight text-foreground">Fly</div>
              <div className="font-display font-700 text-xs text-primary tracking-widest uppercase">High</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn("nav-link", location === href && "active")}
                data-testid={`nav-${label.toLowerCase()}`}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Toggle light/dark mode"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* User avatar → profile */}
            <Link
              href="/profile"
              className={cn("flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-display font-700 transition-colors",
                location === "/profile" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted")}
              title={user?.username}
            >
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-900">
                {user?.username?.[0]?.toUpperCase() ?? "?"}
              </div>
            </Link>

            {/* Discreet admin */}
            <Link
              href="/admin"
              className="p-2 rounded-lg text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              title="Admin"
            >
              <Settings size={14} />
            </Link>
          </nav>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border/60 px-4 py-3 flex flex-col gap-1 bg-card">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn("nav-link", location === href && "active")}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
            <Link href="/profile" className="nav-link mt-1" onClick={() => setMobileOpen(false)}>
              <User size={15} />
              {user?.username ?? "Profile"}
            </Link>
            <button
              onClick={() => { toggleTheme(); setMobileOpen(false); }}
              className="nav-link mt-1 w-full text-left"
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
            <button onClick={handleLogout} className="nav-link mt-1 text-muted-foreground w-full text-left">
              <LogOut size={15} />
              Sign out
            </button>
            <Link href="/admin" className="nav-link mt-1 text-muted-foreground/50" onClick={() => setMobileOpen(false)}>
              <Settings size={15} />
              <span className="text-xs">Admin</span>
            </Link>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1" id="main-content">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <PlaneLogo />
            <span className="text-sm text-muted-foreground font-display font-700">FlyHigh</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/rankings" className="hover:text-foreground transition-colors">Rankings</Link>
            <Link href="/planes" className="hover:text-foreground transition-colors">Planes</Link>
            <Link href="/tutorials" className="hover:text-foreground transition-colors">Tutorials</Link>
            <Link href="/gallery" className="hover:text-foreground transition-colors">Gallery</Link>
            <Link href="/my-table" className="hover:text-foreground transition-colors">My Table</Link>
            <Link href="/submit" className="hover:text-foreground transition-colors">Submit</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
