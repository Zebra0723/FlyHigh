import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Lock, User, Plane } from "lucide-react";

export default function AuthPage() {
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ email: "", username: "", password: "" });
  const [remember, setRemember] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.email.trim() || !form.password.trim()) {
      toast({ title: "Fill in all required fields", variant: "destructive" }); return;
    }
    if (mode === "register" && !form.username.trim()) {
      toast({ title: "Enter a username", variant: "destructive" }); return;
    }
    setLoading(true);
    const result = mode === "login"
      ? await login(form.email.trim(), form.password, remember)
      : await register(form.email.trim(), form.username.trim(), form.password, remember);
    setLoading(false);
    if (!result.ok) toast({ title: result.error || "Something went wrong", variant: "destructive" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      {/* Brand */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Plane size={18} className="text-primary" />
        </div>
        <span className="font-display font-900 text-2xl">
          Fly<span className="text-primary">HIGH</span>
        </span>
      </div>

      <div className="w-full max-w-sm bg-card border border-border/60 rounded-2xl p-8 shadow-sm">
        {/* Toggle */}
        <div className="flex rounded-xl overflow-hidden border border-border mb-6">
          {(["login", "register"] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2.5 text-xs font-display font-700 transition-colors ${
                mode === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"
              }`}
            >
              {m === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {mode === "register" && (
            <div>
              <Label className="text-xs mb-1.5 block">Username</Label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={form.username} onChange={set("username")}
                  onKeyDown={e => e.key === "Enter" && submit()}
                  placeholder="e.g. FalconPilot"
                  className="pl-9 h-10 text-sm"
                  autoFocus
                />
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs mb-1.5 block">Email</Label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email" value={form.email} onChange={set("email")}
                onKeyDown={e => e.key === "Enter" && submit()}
                placeholder="you@example.com"
                className="pl-9 h-10 text-sm"
                autoFocus={mode === "login"}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">Password {mode === "register" && <span className="text-muted-foreground">(min 6 chars)</span>}</Label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={showPw ? "text" : "password"} value={form.password} onChange={set("password")}
                onKeyDown={e => e.key === "Enter" && submit()}
                placeholder="••••••••"
                className="pl-9 pr-10 h-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Remember Me */}
        <button
          type="button"
          onClick={() => setRemember(r => !r)}
          className="flex items-center gap-2.5 mt-4 w-full text-left group"
        >
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            remember ? "bg-primary border-primary" : "border-border bg-background"
          }`}>
            {remember && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            Remember me — stay signed in on this device
          </span>
        </button>

        <button
          onClick={submit}
          disabled={loading}
          className="w-full mt-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-display font-700 text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="text-primary font-700 hover:underline"
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>

        {mode === "login" && (
          <p className="text-center text-xs text-muted-foreground mt-3 leading-relaxed">
            Forgot password? Email admin at{" "}
            <a href="mailto:arjunvirjain@icloud.com" className="text-primary hover:underline font-500">arjunvirjain@icloud.com</a>
            {" "}to change your password. We will try to respond within 24 hours.
          </p>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-6 text-center max-w-xs">
        Your private ranking table, global leaderboard, and community gallery — all in one place.
      </p>
    </div>
  );
}
