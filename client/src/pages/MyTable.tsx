import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Trophy, ChevronRight, Save, Globe, Copy, Check, Info, Plane } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, apiFetch } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { PersonalPlaneWithStats, PersonalEvent } from "@shared/schema";

const SUBMIT_TYPES = [
  { value: "both",        label: "Both",           desc: "Appears on Rankings + Plane Database" },
  { value: "leaderboard", label: "Leaderboard only", desc: "Rankings page only, not Plane Database" },
  { value: "planes",      label: "Plane Database only", desc: "Plane Database only, no ranking" },
] as const;

function SubmitToGlobalDialog({ plane, onClose }: { plane: PersonalPlaneWithStats; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [submissionType, setSubmissionType] = useState<"both"|"leaderboard"|"planes">("both");
  const [planeNotes, setPlaneNotes] = useState("");
  const [aiSummary, setAiSummary] = useState("");

  const submit = useMutation({
    mutationFn: () => apiRequest("POST", "/api/global", {
      planeName: plane.name,
      totalRaces: plane.stats?.totalRaces ?? 0,
      wins: plane.stats?.wins ?? 0,
      avgFinish: plane.stats?.avgFinish ?? null,
      bestDistanceMeters: plane.stats?.bestDistanceMeters ?? null,
      bestHangtimeSeconds: plane.stats?.bestHangtimeSeconds ?? null,
      winRate: plane.stats?.winRate ?? null,
      submissionType,
      planeNotes: planeNotes.trim(),
      aiSummary: aiSummary.trim(),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/global"], refetchType: "all" });
      qc.invalidateQueries({ queryKey: ["/api/planes/community"], refetchType: "all" });
      toast({ title: "Submitted — awaiting admin approval." });
      onClose();
    },
    onError: (e: any) => toast({ title: e.message || "Failed", variant: "destructive" }),
  });
  const s = plane.stats;
  const showPlaneFields = submissionType === "planes" || submissionType === "both";
  return (
    <DialogContent className="max-w-sm">
      <DialogHeader><DialogTitle className="font-display font-800 text-base">Submit — {plane.name}</DialogTitle></DialogHeader>
      <p className="text-xs text-muted-foreground">Where should this appear once approved?</p>

      {/* Type selector */}
      <div className="space-y-2 my-3">
        {SUBMIT_TYPES.map(t => (
          <button key={t.value} onClick={() => setSubmissionType(t.value)}
            className={cn("w-full flex items-start gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors",
              submissionType === t.value ? "bg-primary/10 border-primary/40" : "bg-muted/30 border-border/50 hover:bg-muted/60")}>
            <div className={cn("mt-0.5 w-4 h-4 rounded-full flex-shrink-0 border-2 flex items-center justify-center transition-colors",
              submissionType === t.value ? "border-primary" : "border-border")}>
              {submissionType === t.value && <div className="w-2 h-2 rounded-full bg-primary" />}
            </div>
            <div>
              <div className="text-xs font-700 text-foreground">{t.label}</div>
              <div className="text-[11px] text-muted-foreground">{t.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Plane Database fields */}
      {showPlaneFields && (
        <div className="space-y-2 border-t border-border/50 pt-3">
          <p className="text-[11px] text-muted-foreground font-700 uppercase tracking-wider">For the Plane Database</p>
          <div>
            <Label className="text-xs mb-1 block">Short description (optional)</Label>
            <Input value={aiSummary} onChange={e => setAiSummary(e.target.value)} placeholder="e.g. Great distance glider, stable in wind" className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Build notes (optional)</Label>
            <Input value={planeNotes} onChange={e => setPlaneNotes(e.target.value)} placeholder="e.g. A4, sharp creases" className="h-8 text-xs" />
          </div>
        </div>
      )}

      {/* Stats preview */}
      {(submissionType === "leaderboard" || submissionType === "both") && (
        <div className="bg-muted/50 rounded-xl p-3 space-y-1 mt-2">
          <p className="text-[11px] text-muted-foreground font-700 uppercase tracking-wider mb-1.5">Stats being submitted</p>
          {[["Races", s?.totalRaces ?? 0],["Wins", s?.wins ?? 0],
            ["Avg pos.", s?.avgFinish?.toFixed(1) ?? "—"],["Win rate", s?.winRate != null ? `${(s.winRate*100).toFixed(0)}%` : "—"],
          ].map(([k,v]) => (
            <div key={String(k)} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{k}</span><span className="font-700">{String(v)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-muted text-foreground text-sm font-700 border border-border">Cancel</button>
        <button onClick={() => submit.mutate()} disabled={submit.isPending}
          className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-700 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5">
          <Globe size={13}/> {submit.isPending ? "Submitting…" : "Submit"}
        </button>
      </div>
    </DialogContent>
  );
}

function EnterResultsDialog({ event, planes, onClose }: { event: PersonalEvent; planes: PersonalPlaneWithStats[]; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  // Step 1: pick planes. Step 2: enter results.
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<Set<number>>(new Set(planes.map(p => p.id)));
  const [rows, setRows] = useState<{ planeId: number; name: string; finish: string; dist: string; hang: string }[]>([]);

  const togglePlane = (id: number) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const goToStep2 = () => {
    if (selected.size === 0) { toast({ title: "Select at least one plane", variant: "destructive" }); return; }
    setRows(planes.filter(p => selected.has(p.id)).map(p => ({ planeId: p.id, name: p.name, finish: "", dist: "", hang: "" })));
    setStep(2);
  };

  const submit = useMutation({
    mutationFn: () => {
      const results = rows.filter(r => r.finish.trim() !== "").map(r => ({
        eventId: event.id, personalPlaneId: r.planeId, finishPosition: +r.finish,
        distanceMeters: r.dist ? +r.dist : null, hangtimeSeconds: r.hang ? +r.hang : null,
      }));
      if (!results.length) throw new Error("Enter at least one finish position");
      return apiRequest("POST", `/api/personal/events/${event.id}/results`, results);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/personal/planes"], refetchType: "all" });
      qc.invalidateQueries({ queryKey: ["/api/personal/events"], refetchType: "all" });
      toast({ title: "Results saved & stats updated" });
      onClose();
    },
    onError: (e: any) => toast({ title: e.message || "Failed", variant: "destructive" }),
  });

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="font-display font-800 text-base">{event.name}</DialogTitle>
      </DialogHeader>

      {step === 1 ? (
        <>
          <p className="text-xs text-muted-foreground mb-3">Choose which planes flew in this race:</p>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {planes.map(p => (
              <button
                key={p.id}
                onClick={() => togglePlane(p.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors",
                  selected.has(p.id)
                    ? "bg-primary/10 border-primary/40 text-foreground"
                    : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/60"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors",
                  selected.has(p.id) ? "bg-primary border-primary" : "border-border"
                )}>
                  {selected.has(p.id) && <div className="w-2 h-2 rounded-sm bg-white" />}
                </div>
                <span className="font-700 text-sm">{p.name}</span>
                {p.notes && <span className="text-xs text-muted-foreground ml-auto">{p.notes}</span>}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{selected.size} of {planes.length} selected</p>
          <div className="flex gap-2 mt-3">
            <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-muted text-foreground text-sm font-700 border border-border">Cancel</button>
            <button onClick={goToStep2} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-700 hover:opacity-90">
              Next — Enter Results
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-3">Position · Distance (m, optional) · Hangtime (s, optional)</p>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {rows.map((r, i) => (
              <div key={r.planeId} className="grid grid-cols-[1fr_60px_55px_55px] gap-2 items-center">
                <span className="text-xs font-700 truncate">{r.name}</span>
                <Input placeholder="Pos." type="number" min={1} value={r.finish}
                  onChange={e => setRows(rs => { const c=[...rs]; c[i]={...c[i],finish:e.target.value}; return c; })}
                  className="h-8 text-xs" autoFocus={i===0} />
                <Input placeholder="m" type="number" min={0} step={0.1} value={r.dist}
                  onChange={e => setRows(rs => { const c=[...rs]; c[i]={...c[i],dist:e.target.value}; return c; })}
                  className="h-8 text-xs" />
                <Input placeholder="s" type="number" min={0} step={0.1} value={r.hang}
                  onChange={e => setRows(rs => { const c=[...rs]; c[i]={...c[i],hang:e.target.value}; return c; })}
                  className="h-8 text-xs" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => setStep(1)} className="px-3 py-2 rounded-xl bg-muted text-foreground text-sm font-700 border border-border">Back</button>
            <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-muted text-foreground text-sm font-700 border border-border">Cancel</button>
            <button onClick={() => submit.mutate()} disabled={submit.isPending}
              className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-700 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5">
              <Save size={13}/> {submit.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </>
      )}
    </DialogContent>
  );
}

export default function MyTable() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [submitPlane, setSubmitPlane] = useState<PersonalPlaneWithStats | null>(null);
  const [enterResultsEvent, setEnterResultsEvent] = useState<PersonalEvent | null>(null);
  const [addPlane, setAddPlane] = useState(false);
  const [planeName, setPlaneName] = useState("");
  const [planeNotes, setPlaneNotes] = useState("");
  const [addEvent, setAddEvent] = useState(false);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");

  const { data: planes = [] } = useQuery<PersonalPlaneWithStats[]>({
    queryKey: ["/api/personal/planes"],
    queryFn: () => apiFetch("/api/personal/planes").then(r => r.json()),
    enabled: !!user,
  });

  const { data: events = [] } = useQuery<PersonalEvent[]>({
    queryKey: ["/api/personal/events"],
    queryFn: () => apiFetch("/api/personal/events").then(r => r.json()),
    enabled: !!user,
  });

  const refetch = (...keys: string[]) => keys.forEach(k => qc.invalidateQueries({ queryKey: [k], refetchType: "all" }));

  const createPlane = useMutation({
    mutationFn: () => apiRequest("POST", "/api/personal/planes", { name: planeName.trim(), notes: planeNotes.trim() }),
    onSuccess: () => { refetch("/api/personal/planes"); setPlaneName(""); setPlaneNotes(""); setAddPlane(false); toast({ title: "Plane added" }); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const deletePlane = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/personal/planes/${id}`),
    onSuccess: () => refetch("/api/personal/planes"),
  });

  const createEvent = useMutation({
    mutationFn: () => apiRequest("POST", "/api/personal/events", { name: eventName.trim(), date: eventDate, notes: "" }),
    onSuccess: () => { refetch("/api/personal/events"); setEventName(""); setEventDate(""); setAddEvent(false); toast({ title: "Event created" }); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const deleteEvent = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/personal/events/${id}`),
    onSuccess: () => refetch("/api/personal/events", "/api/personal/planes"),
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display font-900 text-xl text-foreground">My Table</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Private ranking space for <span className="font-700 text-foreground">{user?.username}</span></p>
        </div>
      </div>

      <Tabs defaultValue="planes">
        <TabsList className="mb-6 bg-muted">
          <TabsTrigger value="planes" className="font-display font-700 text-xs flex items-center gap-1.5"><Plane size={12}/> My Planes ({planes.length})</TabsTrigger>
          <TabsTrigger value="events" className="font-display font-700 text-xs flex items-center gap-1.5"><Trophy size={12}/> Race Events ({events.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="planes">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-800 text-sm">Your planes</h2>
            <button onClick={() => setAddPlane(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-700 hover:opacity-90"><Plus size={12}/> Add Plane</button>
          </div>
          {addPlane && (
            <div className="mb-4 bg-card border border-primary/30 rounded-2xl p-4 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label className="text-xs mb-1 block">Name *</Label><Input value={planeName} onChange={e => setPlaneName(e.target.value)} placeholder="e.g. The Falcon" className="h-9 text-sm" autoFocus /></div>
                <div><Label className="text-xs mb-1 block">Notes (optional)</Label><Input value={planeNotes} onChange={e => setPlaneNotes(e.target.value)} placeholder="e.g. A4, slow release" className="h-9 text-sm" /></div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setAddPlane(false)} className="px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-700 border border-border">Cancel</button>
                <button onClick={() => createPlane.mutate()} disabled={!planeName.trim() || createPlane.isPending} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-700 disabled:opacity-50">Add</button>
              </div>
            </div>
          )}
          {planes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm bg-card border border-border/60 rounded-2xl"><Plane size={28} className="mx-auto mb-3 opacity-30"/> No planes yet.</div>
          ) : (
            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden divide-y divide-border/40">
              {planes.map(p => {
                const s = p.stats;
                return (
                  <div key={p.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-display font-700 text-sm text-foreground">{p.name}</div>
                        {p.notes && <div className="text-xs text-muted-foreground">{p.notes}</div>}
                        {s ? (
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                            {[["Races", s.totalRaces], ["Wins", s.wins], ["Avg pos.", s.avgFinish?.toFixed(1) ?? "—"],
                              ["Win rate", s.winRate != null ? `${(s.winRate*100).toFixed(0)}%` : "—"],
                              ...(s.bestDistanceMeters != null ? [["Best dist.", `${s.bestDistanceMeters.toFixed(1)}m`]] : []),
                              ...(s.bestHangtimeSeconds != null ? [["Best hang", `${s.bestHangtimeSeconds.toFixed(1)}s`]] : []),
                            ].map(([k,v]) => (
                              <div key={String(k)} className="text-xs"><span className="text-muted-foreground">{k} </span><span className="font-700">{String(v)}</span></div>
                            ))}
                          </div>
                        ) : <div className="text-xs text-muted-foreground/50 italic mt-1">No races yet</div>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {s && s.totalRaces > 0 && (
                          <button onClick={() => setSubmitPlane(p)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-700 hover:bg-primary/20">
                            <Globe size={11}/> Submit
                          </button>
                        )}
                        <button onClick={() => { if(confirm(`Delete "${p.name}"?`)) deletePlane.mutate(p.id); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="events">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-800 text-sm">Race events</h2>
            <button onClick={() => setAddEvent(true)} disabled={planes.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-700 hover:opacity-90 disabled:opacity-40" title={planes.length === 0 ? "Add a plane first" : ""}>
              <Plus size={12}/> New Event
            </button>
          </div>
          {planes.length === 0 && <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl px-4 py-3 mb-4 text-xs text-amber-400 font-700">Add a plane first before creating events.</div>}
          {addEvent && (
            <div className="mb-4 bg-card border border-primary/30 rounded-2xl p-4 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label className="text-xs mb-1 block">Name *</Label><Input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="e.g. Garden race" className="h-9 text-sm" autoFocus /></div>
                <div><Label className="text-xs mb-1 block">Date *</Label><Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="h-9 text-sm" /></div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setAddEvent(false)} className="px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-700 border border-border">Cancel</button>
                <button onClick={() => createEvent.mutate()} disabled={!eventName.trim() || !eventDate || createEvent.isPending} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-700 disabled:opacity-50">Create</button>
              </div>
            </div>
          )}
          {events.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm bg-card border border-border/60 rounded-2xl"><Trophy size={28} className="mx-auto mb-3 opacity-30"/> No events yet.</div>
          ) : (
            <div className="space-y-3">
              {events.map(ev => (
                <div key={ev.id} className="bg-card border border-border/60 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-700 text-sm">{ev.name}</div>
                    <div className="text-xs text-muted-foreground">{ev.date}</div>
                  </div>
                  {ev.completed && <span className="text-[10px] text-emerald-400 font-700 bg-emerald-400/10 px-2 py-0.5 rounded-full">Done</span>}
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setEnterResultsEvent(ev)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-700 hover:bg-primary/20">
                      <ChevronRight size={12}/> {ev.completed ? "Re-enter" : "Enter results"}
                    </button>
                    <button onClick={() => { if(confirm("Delete event?")) deleteEvent.mutate(ev.id); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive"><Trash2 size={13}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {submitPlane && <Dialog open onOpenChange={() => setSubmitPlane(null)}><SubmitToGlobalDialog plane={submitPlane} onClose={() => setSubmitPlane(null)}/></Dialog>}
      {enterResultsEvent && <Dialog open onOpenChange={() => setEnterResultsEvent(null)}><EnterResultsDialog event={enterResultsEvent} planes={planes} onClose={() => setEnterResultsEvent(null)}/></Dialog>}
    </div>
  );
}
