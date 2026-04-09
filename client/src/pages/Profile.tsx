import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Plane, Trophy, Globe, LogOut, Calendar, Lock, Target, Clock, Medal } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { apiFetch, apiRequest } from "@/lib/queryClient";
import type { PersonalPlaneWithStats, GlobalSubmission } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function Profile() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"overview" | "records" | "security">("overview");
  const [pwForm, setPwForm] = useState({ old: "", new1: "", new2: "" });
  const [pwLoading, setPwLoading] = useState(false);

  const { data: planes = [] } = useQuery<PersonalPlaneWithStats[]>({
    queryKey: ["/api/personal/planes"],
    queryFn: () => apiFetch("/api/personal/planes").then(r => r.json()),
    enabled: !!user,
  });

  const { data: globalEntries = [] } = useQuery<GlobalSubmission[]>({
    queryKey: ["/api/global/mine"],
    queryFn: () => apiFetch("/api/global/mine").then(r => r.json()),
    enabled: !!user,
  });

  const handleLogout = async () => {
    await logout();
    toast({ title: "Signed out" });
  };

  const changePassword = async () => {
    if (!pwForm.old || !pwForm.new1 || !pwForm.new2) { toast({ title: "Fill in all fields", variant: "destructive" }); return; }
    if (pwForm.new1 !== pwForm.new2) { toast({ title: "New passwords don't match", variant: "destructive" }); return; }
    if (pwForm.new1.length < 6) { toast({ title: "Password must be at least 6 characters", variant: "destructive" }); return; }
    setPwLoading(true);
    try {
      await apiRequest("POST", "/api/me/change-password", { oldPassword: pwForm.old, newPassword: pwForm.new1 });
      toast({ title: "Password changed successfully" });
      setPwForm({ old: "", new1: "", new2: "" });
    } catch (e: any) {
      toast({ title: e.message?.includes("401") ? "Current password is incorrect" : "Failed to change password", variant: "destructive" });
    }
    setPwLoading(false);
  };

  if (!user) return null;

  const totalRaces = planes.reduce((s, p) => s + (p.stats?.totalRaces ?? 0), 0);
  const totalWins = planes.reduce((s, p) => s + (p.stats?.wins ?? 0), 0);
  const joinDate = new Date(user.createdAt).toLocaleDateString("en", { month: "long", year: "numeric" });

  // Personal records across all planes
  const bestDist = planes.reduce((best, p) => {
    const d = p.stats?.bestDistanceMeters ?? 0;
    if (d > (best.val ?? 0)) return { val: d, plane: p.name };
    return best;
  }, { val: null as number | null, plane: "" });

  const bestHang = planes.reduce((best, p) => {
    const h = p.stats?.bestHangtimeSeconds ?? 0;
    if (h > (best.val ?? 0)) return { val: h, plane: p.name };
    return best;
  }, { val: null as number | null, plane: "" });

  const bestWinRate = planes.reduce((best, p) => {
    const w = p.stats?.winRate ?? 0;
    if (w > (best.val ?? 0)) return { val: w, plane: p.name };
    return best;
  }, { val: null as number | null, plane: "" });

  const bestFinish = planes.reduce((best, p) => {
    const f = p.stats?.bestFinish;
    if (f != null && (best.val == null || f < best.val)) return { val: f, plane: p.name };
    return best;
  }, { val: null as number | null, plane: "" });

  const mostRaces = planes.reduce((best, p) => {
    const r = p.stats?.totalRaces ?? 0;
    if (r > (best.val ?? 0)) return { val: r, plane: p.name };
    return best;
  }, { val: null as number | null, plane: "" });

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Profile card */}
      <div className="bg-card border border-border/60 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="font-display font-900 text-xl text-primary">{user.username[0].toUpperCase()}</span>
            </div>
            <div>
              <h1 className="font-display font-900 text-lg text-foreground">{user.username}</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <Calendar size={11} /> Joined {joinDate}
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <LogOut size={12} /> Sign out
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-border/50">
          {[["Planes", planes.length], ["Total races", totalRaces], ["Total wins", totalWins]].map(([l, v]) => (
            <div key={String(l)} className="text-center">
              <div className="font-display font-900 text-xl text-foreground">{v}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden border border-border mb-6">
        {([["overview", "My Planes"], ["records", "Personal Records"], ["security", "Security"]] as const).map(([v, label]) => (
          <button key={v} onClick={() => setTab(v)} className={cn("flex-1 py-2 text-xs font-display font-700 transition-colors",
            tab === v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary")}>
            {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div className="space-y-4">
          <h2 className="font-display font-800 text-sm text-foreground flex items-center gap-2"><Plane size={14} className="text-primary"/> My Planes</h2>
          {planes.length === 0 ? (
            <div className="text-center py-8 bg-card border border-border/60 rounded-2xl text-sm text-muted-foreground">
              No planes yet — go to <button onClick={() => setLocation("/my-table")} className="text-primary font-700">My Table</button> to add some.
            </div>
          ) : (
            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden divide-y divide-border/40">
              {planes.map(p => (
                <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-display font-700 text-sm text-foreground">{p.name}</div>
                    {p.notes && <div className="text-xs text-muted-foreground">{p.notes}</div>}
                  </div>
                  {p.stats ? (
                    <div className="flex gap-3 text-xs flex-shrink-0">
                      <span><span className="text-muted-foreground">Races </span><span className="font-700">{p.stats.totalRaces}</span></span>
                      <span><span className="text-muted-foreground">Wins </span><span className="font-700">{p.stats.wins}</span></span>
                      <span><span className="text-muted-foreground">WR </span><span className="font-700">{p.stats.winRate != null ? `${(p.stats.winRate*100).toFixed(0)}%` : "—"}</span></span>
                    </div>
                  ) : <span className="text-xs text-muted-foreground/50 italic">No races</span>}
                </div>
              ))}
            </div>
          )}

          {globalEntries.length > 0 && (
            <>
              <h2 className="font-display font-800 text-sm text-foreground flex items-center gap-2 pt-2"><Globe size={14} className="text-primary"/> Global Submissions</h2>
              <div className="bg-card border border-border/60 rounded-2xl overflow-hidden divide-y divide-border/40">
                {globalEntries.map(g => (
                  <div key={g.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-display font-700 text-sm text-foreground">{g.planeName}</div>
                      <div className="text-xs text-muted-foreground">{g.totalRaces} races · {g.wins} wins</div>
                    </div>
                    <span className={cn("text-[10px] font-700 px-2 py-0.5 rounded-full",
                      g.status === "approved" ? "bg-emerald-400/15 text-emerald-400" :
                      g.status === "rejected" ? "bg-destructive/15 text-destructive" :
                      "bg-amber-400/15 text-amber-400")}>{g.status}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Personal Records */}
      {tab === "records" && (
        <div className="space-y-4">
          <h2 className="font-display font-800 text-sm text-foreground flex items-center gap-2"><Medal size={14} className="text-primary"/> Your All-Time Records</h2>
          {totalRaces === 0 ? (
            <div className="text-center py-10 bg-card border border-border/60 rounded-2xl text-sm text-muted-foreground">
              <Trophy size={28} className="mx-auto mb-3 opacity-30"/>
              No races logged yet. Go to <button onClick={() => setLocation("/my-table")} className="text-primary font-700">My Table</button> to start tracking.
            </div>
          ) : (
            <div className="grid gap-3">
              {[
                { label: "Best finish position", icon: Trophy, value: bestFinish.val != null ? `#${bestFinish.val}` : "—", plane: bestFinish.plane, color: "text-amber-400" },
                { label: "Best distance", icon: Target, value: bestDist.val != null ? `${bestDist.val.toFixed(1)} m` : "—", plane: bestDist.plane, color: "text-emerald-400" },
                { label: "Best hangtime", icon: Clock, value: bestHang.val != null ? `${bestHang.val.toFixed(1)} s` : "—", plane: bestHang.plane, color: "text-blue-400" },
                { label: "Best win rate", icon: Trophy, value: bestWinRate.val != null ? `${(bestWinRate.val*100).toFixed(0)}%` : "—", plane: bestWinRate.plane, color: "text-primary" },
                { label: "Most races (one plane)", icon: Plane, value: mostRaces.val != null ? String(mostRaces.val) : "—", plane: mostRaces.plane, color: "text-purple-400" },
                { label: "Total races", icon: Trophy, value: String(totalRaces), plane: `across ${planes.length} plane${planes.length !== 1 ? "s" : ""}`, color: "text-foreground" },
                { label: "Total wins", icon: Medal, value: String(totalWins), plane: `${totalRaces > 0 ? ((totalWins/totalRaces)*100).toFixed(0) : 0}% overall win rate`, color: "text-amber-400" },
              ].map(({ label, icon: Icon, value, plane, color }) => (
                <div key={label} className="bg-card border border-border/60 rounded-2xl px-5 py-4 flex items-center gap-4">
                  <Icon size={20} className={color} />
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground">{label}</div>
                    {plane && <div className="text-[11px] text-muted-foreground/60">{plane}</div>}
                  </div>
                  <div className={cn("font-display font-900 text-xl", color)}>{value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Security */}
      {tab === "security" && (
        <div className="space-y-4">
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h2 className="font-display font-800 text-sm text-foreground flex items-center gap-2 mb-4"><Lock size={14} className="text-primary"/> Change Password</h2>
            <div className="space-y-3">
              <div><Label className="text-xs mb-1 block">Current password</Label>
                <Input type="password" value={pwForm.old} onChange={e => setPwForm(f => ({...f, old: e.target.value}))} placeholder="••••••••" className="h-9 text-sm" /></div>
              <div><Label className="text-xs mb-1 block">New password</Label>
                <Input type="password" value={pwForm.new1} onChange={e => setPwForm(f => ({...f, new1: e.target.value}))} placeholder="Min 6 characters" className="h-9 text-sm" /></div>
              <div><Label className="text-xs mb-1 block">Confirm new password</Label>
                <Input type="password" value={pwForm.new2} onChange={e => setPwForm(f => ({...f, new2: e.target.value}))} placeholder="••••••••" className="h-9 text-sm" /></div>
              <button onClick={changePassword} disabled={pwLoading}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-display font-700 hover:opacity-90 disabled:opacity-50 transition-opacity mt-1">
                {pwLoading ? "Changing…" : "Change Password"}
              </button>
            </div>
          </div>
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h2 className="font-display font-800 text-sm text-foreground mb-1">Account info</h2>
            <p className="text-xs text-muted-foreground mb-3">If you've forgotten your password, contact the admin to have it reset.</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Username</span><span className="font-700">{user.username}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-700">{user.email}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Joined</span><span className="font-700">{joinDate}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
