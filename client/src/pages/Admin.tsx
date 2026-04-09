import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Settings, Plane, Trophy, BookOpen, Users, ImageIcon,
  Plus, Trash2, Edit3, Check, X, Eye, EyeOff, ArrowLeft,
  ChevronDown, ChevronUp, Save, Lock, ShieldCheck, Star, Pin,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import TutorialStepEditor from "@/components/TutorialStepEditor";
import { apiRequest, apiFetch } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { PlaneWithStats, RaceEventWithResults, CommunityDesign, GalleryItem, TutorialStepData, GlobalSubmission } from "@shared/schema";

const PLANE_TYPES = ["Glider","Distance","Stunt","Speed","Acrobatic"];
const PAPER_SIZES = ["A4","A3","A5","Letter","Half Letter"];

// ── Auth Gate ─────────────────────────────────────────────────────────────────
function AuthGate({ onAuth }: { onAuth: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const check = async () => {
    const res = await apiRequest("POST", "/api/auth", { password: pw });
    const d = await res.json();
    if (d.ok) onAuth(); else setErr(true);
  };
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm bg-card border border-border/60 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
          <Lock size={20} className="text-primary" />
        </div>
        <h1 className="font-display font-900 text-xl text-foreground mb-1">Admin Panel</h1>
        <p className="text-sm text-muted-foreground mb-6">Enter your admin password to continue.</p>
        <Input type="password" value={pw} onChange={e => { setPw(e.target.value); setErr(false); }} onKeyDown={e => e.key === "Enter" && check()} placeholder="Password" className={cn("text-center mb-3", err && "border-destructive")} data-testid="input-admin-pw" autoFocus />
        {err && <p className="text-xs text-destructive mb-3">Wrong password</p>}
        <button onClick={check} className="w-full py-2 rounded-xl bg-primary text-primary-foreground font-display font-700 text-sm hover:opacity-90 transition-opacity" data-testid="btn-admin-login">Enter</button>
        <Link href="/"><p className="text-xs text-muted-foreground mt-4 hover:text-foreground cursor-pointer transition-colors">← Back to site</p></Link>
      </div>
    </div>
  );
}

// ── Plane Form ────────────────────────────────────────────────────────────────
function PlaneForm({ plane, onSave, onCancel }: { plane?: PlaneWithStats; onSave: (data: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: plane?.name ?? "", group: plane?.group ?? "A4", type: plane?.type ?? "Glider",
    creator: plane?.creator ?? "", description: plane?.description ?? "",
    difficulty: plane?.difficulty ?? 2, paperSize: plane?.paperSize ?? "A4",
    flyingStyle: plane?.flyingStyle ?? "", throwingTips: plane?.throwingTips ?? "",
    featured: plane?.featured ?? false,
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div><Label className="text-xs mb-1.5 block">Plane name *</Label><Input value={form.name} onChange={e => set("name",e.target.value)} placeholder="Name" className="text-sm h-9" data-testid="admin-input-name" /></div>
        <div><Label className="text-xs mb-1.5 block">Creator</Label><Input value={form.creator} onChange={e => set("creator",e.target.value)} placeholder="Creator" className="text-sm h-9" /></div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div><Label className="text-xs mb-1.5 block">Group</Label><Input value={form.group} onChange={e => set("group",e.target.value)} placeholder="A4" className="text-sm h-9" /></div>
        <div><Label className="text-xs mb-1.5 block">Type</Label><Select value={form.type} onValueChange={v => set("type",v)}><SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent>{PLANE_TYPES.map(t=><SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent></Select></div>
        <div><Label className="text-xs mb-1.5 block">Paper</Label><Select value={form.paperSize} onValueChange={v => set("paperSize",v)}><SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent>{PAPER_SIZES.map(s=><SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent></Select></div>
        <div><Label className="text-xs mb-1.5 block">Difficulty</Label><Select value={String(form.difficulty)} onValueChange={v => set("difficulty",+v)}><SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent>{[["1","Beginner"],["2","Easy"],["3","Intermediate"],["4","Advanced"],["5","Expert"]].map(([v,l])=><SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><Label className="text-xs mb-1.5 block">Flying style</Label><Input value={form.flyingStyle} onChange={e => set("flyingStyle",e.target.value)} placeholder="e.g. Long glide" className="text-sm h-9" /></div>
        <div><Label className="text-xs mb-1.5 block">Throwing tip</Label><Input value={form.throwingTips} onChange={e => set("throwingTips",e.target.value)} placeholder="e.g. Soft release…" className="text-sm h-9" /></div>
      </div>
      <div><Label className="text-xs mb-1.5 block">Description</Label><Textarea value={form.description} onChange={e => set("description",e.target.value)} rows={2} className="text-sm resize-none" /></div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.featured} onChange={e => set("featured",e.target.checked)} className="w-4 h-4 rounded" />
        <span className="text-xs text-foreground">Featured on homepage</span>
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl bg-muted text-foreground text-sm font-display font-700 border border-border hover:bg-secondary transition-colors">Cancel</button>
        <button type="button" onClick={() => onSave(form)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-display font-700 hover:opacity-90 transition-opacity" data-testid="btn-save-plane"><Save size={13} /> Save</button>
      </div>
    </div>
  );
}

// ── Tutorial Editor Panel ─────────────────────────────────────────────────────
function TutorialPanel({ planeId, planeName }: { planeId: number; planeName: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [steps, setSteps] = useState<TutorialStepData[] | null>(null);

  const { data: saved, isLoading } = useQuery<any[]>({
    queryKey: ["/api/planes", planeId, "tutorial"],
    queryFn: () => apiFetch(`/api/planes/${planeId}/tutorial`).then(r => r.json()),
  });

  const workingSteps: TutorialStepData[] = steps ?? (saved ?? []).map((s: any) => ({
    stepNumber: s.stepNumber, title: s.title, instruction: s.instruction, tip: s.tip,
    imageDataUrl: s.imageDataUrl, imageMimeType: s.imageMimeType,
  }));

  const saveMutation = useMutation({
    mutationFn: (data: TutorialStepData[]) => apiRequest("PUT", `/api/planes/${planeId}/tutorial`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/planes"] }); toast({ title: "Tutorial saved", description: `${planeName} tutorial updated.` }); setSteps(null); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  if (isLoading) return <div className="skeleton h-32 rounded-xl" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted-foreground">{workingSteps.length} step{workingSteps.length !== 1 ? "s" : ""}. Each step can have text, a tip, and a photo.</p>
        <button
          onClick={() => saveMutation.mutate(workingSteps)}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-display font-700 hover:opacity-90 disabled:opacity-50 transition-opacity"
          data-testid="btn-save-tutorial"
        >
          <Save size={13} /> {saveMutation.isPending ? "Saving…" : "Save Tutorial"}
        </button>
      </div>
      <TutorialStepEditor steps={workingSteps} onChange={s => setSteps(s)} />
    </div>
  );
}

// ── Main Admin ────────────────────────────────────────────────────────────────
export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [editingPlane, setEditingPlane] = useState<PlaneWithStats | "new" | null>(null);
  const [tutorialPlane, setTutorialPlane] = useState<PlaneWithStats | null>(null);
  const [newEvent, setNewEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ name: "", date: "", group: "", notes: "" });
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);
  const [resultForms, setResultForms] = useState<Record<number, { planeId: string; finish: string }[]>>({});

  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: planes } = useQuery<PlaneWithStats[]>({ queryKey: ["/api/planes"], enabled: authed });
  const { data: events } = useQuery<RaceEventWithResults[]>({ queryKey: ["/api/events"], enabled: authed });
  const { data: communityDesigns } = useQuery<CommunityDesign[]>({ queryKey: ["/api/admin/community/designs"], queryFn: () => apiFetch("/api/admin/community/designs").then(r => r.json()), enabled: authed });
  const { data: galleryItems } = useQuery<GalleryItem[]>({ queryKey: ["/api/admin/gallery"], queryFn: () => apiFetch("/api/admin/gallery").then(r => r.json()), enabled: authed });
  const { data: globalEntries } = useQuery<GlobalSubmission[]>({ queryKey: ["/api/admin/global"], queryFn: () => apiFetch("/api/admin/global").then(r => r.json()), enabled: authed });

  const savePlane = useMutation({
    mutationFn: (data: any) => editingPlane === "new" ? apiRequest("POST", "/api/planes", data) : apiRequest("PUT", `/api/planes/${(editingPlane as PlaneWithStats).id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/planes"] }); qc.invalidateQueries({ queryKey: ["/api/leaderboard"] }); setEditingPlane(null); toast({ title: "Plane saved" }); },
  });

  const deletePlane = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/planes/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/planes"] }); qc.invalidateQueries({ queryKey: ["/api/leaderboard"] }); toast({ title: "Plane deleted" }); },
  });

  const createEvent = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/events", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/events"] }); setNewEvent(false); setEventForm({ name:"",date:"",group:"",notes:"" }); toast({ title: "Event created" }); },
  });

  const deleteEvent = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/events/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/events"] }),
  });

  const submitResults = useMutation({
    mutationFn: ({ id, results }: any) => apiRequest("POST", `/api/events/${id}/results`, results),
    onSuccess: (_, { id }) => { ["/api/events","/api/leaderboard","/api/planes"].forEach(k => qc.invalidateQueries({ queryKey: [k], refetchType: 'all' })); setExpandedEvent(null); toast({ title: "Results saved & rankings updated" }); },
  });

  const refetchAll = (keys: string[][]) => keys.forEach(k => qc.invalidateQueries({ queryKey: k, refetchType: 'all' }));

  const reviewDesign = useMutation({
    mutationFn: ({ id, status }: any) => apiRequest("PATCH", `/api/community/designs/${id}/status`, { status }),
    onSuccess: () => { refetchAll([["/api/admin/community/designs"], ["/api/community/designs"]]); toast({ title: "Design updated" }); },
    onError: () => toast({ title: "Action failed", variant: "destructive" }),
  });

  const deleteDesign = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/community/designs/${id}`),
    onSuccess: () => { refetchAll([["/api/admin/community/designs"], ["/api/community/designs"]]); toast({ title: "Design deleted" }); },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  const reviewGallery = useMutation({
    mutationFn: ({ id, status }: any) => apiRequest("PATCH", `/api/gallery/${id}/status`, { status }),
    onSuccess: () => { refetchAll([["/api/admin/gallery"], ["/api/gallery"]]); toast({ title: "Gallery item updated" }); },
    onError: () => toast({ title: "Action failed", variant: "destructive" }),
  });

  const deleteGallery = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/gallery/${id}`),
    onSuccess: () => { refetchAll([["/api/admin/gallery"], ["/api/gallery"]]); toast({ title: "Gallery item deleted" }); },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  const reviewGlobal = useMutation({
    mutationFn: ({ id, status }: any) => apiRequest("PATCH", `/api/global/${id}/status`, { status }),
    onSuccess: () => { refetchAll([["/api/admin/global"], ["/api/global"]]); toast({ title: "Global entry updated" }); },
    onError: () => toast({ title: "Action failed", variant: "destructive" }),
  });

  const deleteGlobalEntry = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/global/${id}`),
    onSuccess: () => { refetchAll([["/api/admin/global"], ["/api/global"]]); toast({ title: "Global entry removed" }); },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  if (!authed) return <AuthGate onAuth={() => setAuthed(true)} />;

  const pendingDesigns = (communityDesigns ?? []).filter(d => d.status === "pending").length;
  const pendingGallery = (galleryItems ?? []).filter(g => g.status === "pending").length;
  const pendingGlobal = (globalEntries ?? []).filter(g => g.status === "pending").length;
  const totalGlobal = (globalEntries ?? []).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck size={18} className="text-primary" />
            <span className="font-display font-800 text-sm text-foreground">Admin Panel</span>
            {(pendingDesigns + pendingGallery) > 0 && (
              <span className="w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-700 flex items-center justify-center">{pendingDesigns + pendingGallery}</span>
            )}
          </div>
          <Link href="/"><button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft size={12} /> Back to site</button></Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Tabs defaultValue="planes">
          <TabsList className="mb-6 bg-muted flex-wrap h-auto gap-1">
            {[
              { value: "users", label: "Users", icon: Users },
              { value: "featured", label: "Featured", icon: Star },
              { value: "planes", label: "Planes", icon: Plane },
              { value: "tutorials", label: "Tutorials", icon: BookOpen },
              { value: "results", label: "Race Results", icon: Trophy },
              { value: "designs", label: `Designs${pendingDesigns > 0 ? ` (${pendingDesigns})` : ""}`, icon: Users },
              { value: "gallery", label: `Gallery${pendingGallery > 0 ? ` (${pendingGallery})` : ""}`, icon: ImageIcon },
              { value: "global", label: `Global${pendingGlobal > 0 ? ` (${pendingGlobal})` : ` (${totalGlobal})`}`, icon: Trophy },
            ].map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="font-display font-700 text-xs flex items-center gap-1.5">
                <Icon size={12} />{label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Planes tab ─────────────────────────────────────────────────── */}
          <TabsContent value="planes">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-800 text-base text-foreground">Planes ({planes?.length ?? 0})</h2>
              <button onClick={() => setEditingPlane("new")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-display font-700 hover:opacity-90 transition-opacity" data-testid="btn-add-plane">
                <Plus size={12} /> Add Plane
              </button>
            </div>

            {editingPlane && (
              <div className="mb-6 bg-card border border-primary/30 rounded-2xl p-5">
                <h3 className="font-display font-700 text-sm text-foreground mb-4">{editingPlane === "new" ? "New Plane" : `Edit: ${(editingPlane as PlaneWithStats).name}`}</h3>
                <PlaneForm plane={editingPlane === "new" ? undefined : editingPlane as PlaneWithStats} onSave={d => savePlane.mutate(d)} onCancel={() => setEditingPlane(null)} />
              </div>
            )}

            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden divide-y divide-border/40">
              {(planes ?? []).map(p => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors" data-testid={`admin-plane-${p.id}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-700 text-sm text-foreground">{p.name}</span>
                      <span className={cn("group-badge text-[10px]", p.group==="A4"?"group-a4":p.group==="XL"?"group-xl":p.group==="XS"?"group-xs":"group-default")}>{p.group}</span>
                      <span className={cn("type-badge text-[10px]", `type-${p.type.toLowerCase()}`)}>{p.type}</span>
                      {p.featured && <span className="text-[10px] text-accent font-700">★ Featured</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">by {p.creator} · {p.stats ? `${p.stats.totalRaces} races · ${p.stats.totalPoints} pts` : "No races"}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setEditingPlane(p)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit"><Edit3 size={13} /></button>
                    <button onClick={() => { if(confirm(`Delete "${p.name}"?`)) deletePlane.mutate(p.id); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors" title="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── Tutorials tab ──────────────────────────────────────────────── */}
          <TabsContent value="tutorials">
            <h2 className="font-display font-800 text-base text-foreground mb-2">Tutorial Editor</h2>
            <p className="text-sm text-muted-foreground mb-5">Select a plane to edit its step-by-step tutorial. Each step can include text, a tip, and a photo.</p>

            {tutorialPlane ? (
              <div>
                <button onClick={() => setTutorialPlane(null)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4 group">
                  <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" /> All planes
                </button>
                <div className="flex items-center gap-3 mb-5 p-4 bg-card border border-border/60 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={14} className="text-primary" />
                  </div>
                  <div>
                    <div className="font-display font-700 text-sm text-foreground">{tutorialPlane.name}</div>
                    <div className="text-xs text-muted-foreground">by {tutorialPlane.creator} · {tutorialPlane.type} · {tutorialPlane.paperSize}</div>
                  </div>
                </div>
                <TutorialPanel planeId={tutorialPlane.id} planeName={tutorialPlane.name} />
              </div>
            ) : (
              <div className="bg-card border border-border/60 rounded-2xl overflow-hidden divide-y divide-border/40">
                {(planes ?? []).map(p => {
                  const stepCount = p.tutorialSteps?.length ?? 0;
                  return (
                    <button key={p.id} onClick={() => setTutorialPlane(p)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left" data-testid={`tutorial-edit-${p.id}`}>
                      <div className="flex-1 min-w-0">
                        <div className="font-display font-700 text-sm text-foreground">{p.name}</div>
                        <div className="text-xs text-muted-foreground">by {p.creator}</div>
                      </div>
                      <div className="text-xs text-muted-foreground mr-2">
                        {stepCount === 0 ? <span className="text-muted-foreground/50 italic">No steps yet</span> : <span className="text-primary font-700">{stepCount} steps</span>}
                      </div>
                      <ChevronDown size={14} className="text-muted-foreground flex-shrink-0 -rotate-90" />
                    </button>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Race Results tab ───────────────────────────────────────────── */}
          <TabsContent value="results">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-800 text-base text-foreground">Race Events</h2>
              <button onClick={() => setNewEvent(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-display font-700 hover:opacity-90 transition-opacity" data-testid="btn-add-event">
                <Plus size={12} /> New Event
              </button>
            </div>

            {newEvent && (
              <div className="mb-4 bg-card border border-primary/30 rounded-2xl p-4 space-y-3">
                <h3 className="font-display font-700 text-sm">New Race Event</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><Label className="text-xs mb-1 block">Event name *</Label><Input value={eventForm.name} onChange={e => setEventForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Round 1" className="h-9 text-sm" /></div>
                  <div><Label className="text-xs mb-1 block">Date *</Label><Input type="date" value={eventForm.date} onChange={e => setEventForm(f=>({...f,date:e.target.value}))} className="h-9 text-sm" /></div>
                  <div><Label className="text-xs mb-1 block">Group filter (optional)</Label><Input value={eventForm.group} onChange={e => setEventForm(f=>({...f,group:e.target.value}))} placeholder="e.g. A4" className="h-9 text-sm" /></div>
                  <div><Label className="text-xs mb-1 block">Notes</Label><Input value={eventForm.notes} onChange={e => setEventForm(f=>({...f,notes:e.target.value}))} className="h-9 text-sm" /></div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setNewEvent(false)} className="px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-700 border border-border">Cancel</button>
                  <button onClick={() => createEvent.mutate(eventForm)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-700 hover:opacity-90 transition-opacity">Create</button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {(events ?? []).map(event => {
                const isOpen = expandedEvent === event.id;
                const activePlanes = (planes ?? []).filter(p => !event.group || p.group === event.group);
                if (!resultForms[event.id] && isOpen) {
                  setResultForms(f => ({ ...f, [event.id]: activePlanes.map(p => ({ planeId: String(p.id), finish: "" })) }));
                }
                return (
                  <div key={event.id} className="bg-card border border-border/60 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1">
                        <div className="font-display font-700 text-sm text-foreground">{event.name}</div>
                        <div className="text-xs text-muted-foreground">{event.date}{event.group ? ` · ${event.group}` : ""}{event.notes ? ` · ${event.notes}` : ""}</div>
                      </div>
                      {event.completed && <span className="text-[10px] text-emerald-400 font-700 bg-emerald-400/10 px-2 py-0.5 rounded-full">Completed</span>}
                      <div className="flex items-center gap-1">
                        <button onClick={() => setExpandedEvent(isOpen ? null : event.id)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs font-700">
                          {isOpen ? "Close" : "Enter Results"}
                        </button>
                        <button onClick={() => { if(confirm("Delete this event?")) deleteEvent.mutate(event.id); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="border-t border-border/50 px-4 py-4">
                        <p className="text-xs text-muted-foreground mb-3">Enter finish position for each plane. Leave blank to skip a plane.</p>
                        <div className="space-y-2 mb-4">
                          {activePlanes.map((p, idx) => (
                            <div key={p.id} className="flex items-center gap-3">
                              <span className="text-xs font-700 text-foreground w-40 truncate">{p.name}</span>
                              <Input
                                type="number" min={1} max={activePlanes.length}
                                placeholder="Finish pos."
                                value={resultForms[event.id]?.[idx]?.finish ?? ""}
                                onChange={e => setResultForms(f => { const copy = [...(f[event.id]??[])]; copy[idx] = { planeId: String(p.id), finish: e.target.value }; return { ...f, [event.id]: copy }; })}
                                className="w-28 h-8 text-sm"
                                data-testid={`result-finish-${event.id}-${p.id}`}
                              />
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => {
                            const rows = (resultForms[event.id] ?? []).filter(r => r.finish.trim() !== "").map(r => ({ planeId: +r.planeId, finishPosition: +r.finish }));
                            if (!rows.length) { toast({ title: "No positions entered", variant: "destructive" }); return; }
                            submitResults.mutate({ id: event.id, results: rows });
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-display font-700 hover:opacity-90 transition-opacity"
                          data-testid={`btn-submit-results-${event.id}`}
                        >
                          <Save size={13} /> Save Results &amp; Update Rankings
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* ── Community Designs tab ──────────────────────────────────────── */}
          <TabsContent value="designs">
            <h2 className="font-display font-800 text-base text-foreground mb-4">Community Designs ({communityDesigns?.length ?? 0})</h2>
            {(communityDesigns?.length ?? 0) === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No community submissions yet.</div>
            ) : (
              <div className="space-y-3">
                {(communityDesigns ?? []).map(d => (
                  <div key={d.id} className="bg-card border border-border/60 rounded-2xl p-4" data-testid={`admin-design-${d.id}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-display font-700 text-sm text-foreground mb-0.5">{d.name}</div>
                        <div className="text-xs text-muted-foreground">by {d.authorName}{d.authorEmail ? ` (${d.authorEmail})` : ""} · {d.type} · {d.paperSize}</div>
                        {d.description && <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">{d.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={cn("text-[10px] font-700 px-2 py-0.5 rounded-full", d.status==="approved"?"bg-emerald-400/15 text-emerald-400":d.status==="rejected"?"bg-destructive/15 text-destructive":"bg-amber-400/15 text-amber-400")}>{d.status}</span>
                        {d.status === "pending" && (
                          <>
                            <button onClick={() => reviewDesign.mutate({ id: d.id, status: "approved" })} className="p-1.5 rounded-lg hover:bg-emerald-400/10 text-muted-foreground hover:text-emerald-400 transition-colors" title="Approve"><Check size={13} /></button>
                            <button onClick={() => reviewDesign.mutate({ id: d.id, status: "rejected" })} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Reject"><X size={13} /></button>
                          </>
                        )}
                        <button onClick={() => { if(confirm(`Permanently delete "${d.name}"?`)) deleteDesign.mutate(d.id); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete permanently"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Global Leaderboard tab ──────────────────────────────────── */}
          <TabsContent value="global">
            <h2 className="font-display font-800 text-base text-foreground mb-1">Global Leaderboard Submissions ({globalEntries?.length ?? 0})</h2>
            <p className="text-sm text-muted-foreground mb-4">Approve submissions to make them visible on the public Rankings page. Reject or delete spam/inappropriate entries.</p>
            {(globalEntries?.length ?? 0) === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No global submissions yet.</div>
            ) : (
              <div className="bg-card border border-border/60 rounded-2xl overflow-hidden divide-y divide-border/40">
                {(globalEntries ?? []).map((e, i) => (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <span className="text-xs font-700 text-muted-foreground w-6">#{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-700 text-sm text-foreground flex items-center gap-2">
                        {e.username} <span className="text-muted-foreground font-400">— {e.planeName}</span>
                        <span className={cn("text-[10px] font-700 px-1.5 py-0.5 rounded-full",
                          e.status === "approved" ? "bg-emerald-400/15 text-emerald-400" :
                          e.status === "rejected" ? "bg-destructive/15 text-destructive" :
                          "bg-amber-400/15 text-amber-400")}>{e.status}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{e.totalRaces} races · {e.wins} wins · avg pos {e.avgFinish?.toFixed(1) ?? "—"} · {e.winRate != null ? `${(e.winRate*100).toFixed(0)}% win rate` : ""}</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {e.status !== "approved" && (
                        <button onClick={() => reviewGlobal.mutate({ id: e.id, status: "approved" })} className="px-2.5 py-1 rounded-lg bg-emerald-400/10 text-emerald-400 text-xs font-700 hover:bg-emerald-400/20 transition-colors">Approve</button>
                      )}
                      {e.status !== "rejected" && (
                        <button onClick={() => reviewGlobal.mutate({ id: e.id, status: "rejected" })} className="px-2.5 py-1 rounded-lg bg-destructive/10 text-destructive text-xs font-700 hover:bg-destructive/20 transition-colors">Reject</button>
                      )}
                      <button onClick={() => { if(confirm(`Delete ${e.username}'s entry?`)) deleteGlobalEntry.mutate(e.id); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Gallery tab ────────────────────────────────────────────────── */}
          <TabsContent value="gallery">
            <h2 className="font-display font-800 text-base text-foreground mb-4">Gallery Submissions ({galleryItems?.length ?? 0})</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(galleryItems ?? []).map(item => (
                <div key={item.id} className="bg-card border border-border/60 rounded-2xl overflow-hidden" data-testid={`admin-gallery-${item.id}`}>
                  <div className="relative aspect-[4/3] bg-muted/40 overflow-hidden">
                    {item.mediaType === "video"
                      ? <video src={item.dataUrl} className="w-full h-full object-cover" muted />
                      : <img src={item.dataUrl} alt={item.caption||""} className="w-full h-full object-cover" />}
                    <span className={cn("absolute top-2 left-2 text-[10px] font-700 px-2 py-0.5 rounded-full", item.status==="approved"?"bg-emerald-400/80 text-white":item.status==="rejected"?"bg-destructive/80 text-white":"bg-amber-400/80 text-black")}>{item.status}</span>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-foreground mb-1 truncate">{item.uploaderName}{item.caption ? ` — ${item.caption}` : ""}</p>
                    <div className="flex gap-2 mt-2">
                      {item.status !== "approved" && <button onClick={() => reviewGallery.mutate({ id: item.id, status: "approved" })} className="flex-1 py-1 rounded-lg bg-emerald-400/15 text-emerald-400 text-[11px] font-700 hover:bg-emerald-400/25 transition-colors">Approve</button>}
                      {item.status !== "rejected" && <button onClick={() => reviewGallery.mutate({ id: item.id, status: "rejected" })} className="flex-1 py-1 rounded-lg bg-muted text-muted-foreground text-[11px] font-700 hover:bg-secondary transition-colors border border-border">Reject</button>}
                      <button onClick={() => { if(confirm("Delete this item?")) deleteGallery.mutate(item.id); }} className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── Users tab ───────────────────────────────────────────────── */}
          <TabsContent value="users">
            <UsersTab />
          </TabsContent>

          {/* ── Featured Posts tab ─────────────────────────────────────── */}
          <TabsContent value="featured">
            <FeaturedTab />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    queryFn: () => apiFetch("/api/admin/users").then(r => r.json()),
  });
  const [resetTarget, setResetTarget] = useState<any | null>(null);
  const [newPw, setNewPw] = useState("");
  const [resetting, setResetting] = useState(false);

  const doReset = async () => {
    if (!newPw || newPw.length < 6) { toast({ title: "Password must be 6+ characters", variant: "destructive" }); return; }
    setResetting(true);
    try {
      await apiRequest("POST", `/api/admin/users/${resetTarget.id}/reset-password`, { newPassword: newPw });
      toast({ title: `Password reset for ${resetTarget.username}` });
      setResetTarget(null); setNewPw("");
    } catch { toast({ title: "Reset failed", variant: "destructive" }); }
    setResetting(false);
  };

  const deleteUser = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/users"], refetchType: "all" }); toast({ title: "User deleted" }); },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-800 text-base text-foreground">User Management</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{users.length} registered user{users.length !== 1 ? "s" : ""}. Reset passwords or remove accounts.</p>
        </div>
      </div>

      {/* Reset password modal */}
      {resetTarget && (
        <div className="mb-5 bg-card border border-primary/30 rounded-2xl p-4 space-y-3">
          <h3 className="font-display font-700 text-sm">Reset password for <span className="text-primary">{resetTarget.username}</span></h3>
          <div>
            <Label className="text-xs mb-1 block">New password (min 6 characters)</Label>
            <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doReset()}
              placeholder="Enter new password" className="h-9 text-sm" autoFocus />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setResetTarget(null); setNewPw(""); }} className="px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-700 border border-border">Cancel</button>
            <button onClick={doReset} disabled={resetting} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-700 disabled:opacity-50 hover:opacity-90">
              {resetting ? "Resetting…" : "Reset Password"}
            </button>
          </div>
        </div>
      )}

      {users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No users yet.</div>
      ) : (
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden divide-y divide-border/40">
          {users.map((u: any) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-display font-900 text-sm text-primary flex-shrink-0">
                {u.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-700 text-sm text-foreground">{u.username}</div>
                <div className="text-xs text-muted-foreground">{u.email} · Joined {new Date(u.createdAt).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}</div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => { setResetTarget(u); setNewPw(""); }}
                  className="px-2.5 py-1 rounded-lg bg-muted border border-border text-xs font-700 text-muted-foreground hover:text-foreground transition-colors">
                  Reset PW
                </button>
                <button onClick={() => { if(confirm(`Delete ${u.username}'s account and all their data?`)) deleteUser.mutate(u.id); }}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FeaturedTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: posts = [] } = useQuery<any[]>({
    queryKey: ["/api/featured"],
    queryFn: () => apiFetch("/api/featured").then(r => r.json()),
  });
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ title: "", body: "", badge: "Feature", pinned: false });

  const BADGES = ["Feature", "Best Plane", "Champion", "Record", "Announcement", "Event", "Tip"];

  const openNew = () => { setForm({ title: "", body: "", badge: "Feature", pinned: false }); setEditing("new"); };
  const openEdit = (p: any) => { setForm({ title: p.title, body: p.body, badge: p.badge, pinned: p.pinned }); setEditing(p); };
  const close = () => setEditing(null);

  const save = useMutation({
    mutationFn: () => editing === "new"
      ? apiRequest("POST", "/api/featured", form)
      : apiRequest("PUT", `/api/featured/${editing.id}`, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/featured"], refetchType: "all" }); toast({ title: "Saved" }); close(); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/featured/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/featured"], refetchType: "all" }); toast({ title: "Deleted" }); },
  });

  const badgeColors: Record<string, string> = {
    "Feature": "bg-primary/15 text-primary",
    "Best Plane": "bg-amber-400/15 text-amber-400",
    "Champion": "bg-yellow-400/15 text-yellow-400",
    "Record": "bg-emerald-400/15 text-emerald-400",
    "Announcement": "bg-blue-400/15 text-blue-400",
    "Event": "bg-purple-400/15 text-purple-400",
    "Tip": "bg-rose-400/15 text-rose-400",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-800 text-base text-foreground">Featured Posts</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Publicly visible on the home page. Pin important ones to the top.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-700 hover:opacity-90">
          <Plus size={12} /> New Post
        </button>
      </div>

      {/* Editor */}
      {editing !== null && (
        <div className="mb-6 bg-card border border-primary/30 rounded-2xl p-5 space-y-3">
          <h3 className="font-display font-700 text-sm">{editing === "new" ? "New post" : "Edit post"}</h3>
          <div><Label className="text-xs mb-1 block">Title *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="e.g. Plane of the Week: The Falcon" className="h-9 text-sm" autoFocus /></div>
          <div><Label className="text-xs mb-1 block">Body *</Label>
            <Textarea value={form.body} onChange={e => setForm(f => ({...f, body: e.target.value}))} placeholder="Write your announcement, feature, tip, or record here..." rows={4} className="text-sm resize-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs mb-1 block">Badge</Label>
              <select value={form.badge} onChange={e => setForm(f => ({...f, badge: e.target.value}))} className="w-full h-9 rounded-lg border border-border bg-background text-sm px-2">
                {BADGES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2 pb-0.5">
              <button onClick={() => setForm(f => ({...f, pinned: !f.pinned}))}
                className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-700 transition-colors",
                  form.pinned ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted border-border text-muted-foreground")}>
                <Pin size={12} /> {form.pinned ? "Pinned" : "Pin to top"}
              </button>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={close} className="px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-700 border border-border">Cancel</button>
            <button onClick={() => save.mutate()} disabled={!form.title.trim() || !form.body.trim() || save.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-700 disabled:opacity-50 hover:opacity-90">
              <Save size={12} /> {save.isPending ? "Saving..." : "Save Post"}
            </button>
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm bg-card border border-border/60 rounded-2xl">
          <Star size={28} className="mx-auto mb-3 opacity-30" />
          No posts yet. Create one to feature a plane, announce a record, or share a tip.
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p: any) => (
            <div key={p.id} className="bg-card border border-border/60 rounded-2xl px-4 py-3 flex items-start gap-3">
              {p.pinned && <Pin size={12} className="text-primary mt-1 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={cn("text-[10px] font-700 px-2 py-0.5 rounded-full", badgeColors[p.badge] ?? "bg-muted text-muted-foreground")}>{p.badge}</span>
                  <span className="font-display font-700 text-sm text-foreground">{p.title}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{p.body}</p>
                <p className="text-[11px] text-muted-foreground/50 mt-1.5">{new Date(p.createdAt).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit3 size={13} /></button>
                <button onClick={() => { if(confirm("Delete this post?")) del.mutate(p.id); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
