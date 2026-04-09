import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layers, Search, User, Trophy, Target, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlaneCard } from "@/components/PlaneCard";
import { apiFetch } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { PlaneWithStats, GlobalSubmission } from "@shared/schema";
import { Link } from "wouter";

// Card for community-submitted planes from global_submissions
function CommunityPlaneCard({ g }: { g: GlobalSubmission }) {
  const s = g;
  return (
    <div className="bg-card border border-border/60 rounded-2xl p-4 hover:border-primary/30 transition-all flex flex-col gap-3">
      <div>
        <div className="font-display font-800 text-sm text-foreground">{g.planeName}</div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
          <User size={11} /> by <span className="font-700 text-foreground">{g.username}</span>
        </div>
        {g.aiSummary && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{g.aiSummary}</p>}
        {g.planeNotes && <p className="text-xs text-muted-foreground/70 mt-0.5 italic">{g.planeNotes}</p>}
      </div>

      {(g.totalRaces > 0) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 border-t border-border/40">
          {[
            ["Races", g.totalRaces],
            ["Wins", g.wins],
            ["Avg pos.", g.avgFinish != null ? g.avgFinish.toFixed(1) : "—"],
            ["Win rate", g.winRate != null ? `${(g.winRate * 100).toFixed(0)}%` : "—"],
            ...(g.bestDistanceMeters != null ? [["Best dist.", `${g.bestDistanceMeters.toFixed(1)} m`]] : []),
            ...(g.bestHangtimeSeconds != null ? [["Best hang", `${g.bestHangtimeSeconds.toFixed(1)} s`]] : []),
          ].map(([k, v]) => (
            <div key={String(k)} className="text-xs">
              <span className="text-muted-foreground">{k} </span>
              <span className="font-700 text-foreground">{String(v)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="text-[10px] text-muted-foreground/50 mt-auto">Community submission</div>
    </div>
  );
}

export default function Planes() {
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [tab, setTab] = useState<"official" | "community">("official");

  const { data: planes, isLoading: loadingPlanes } = useQuery<PlaneWithStats[]>({
    queryKey: ["/api/planes"],
  });

  const { data: communityPlanes = [], isLoading: loadingCommunity } = useQuery<GlobalSubmission[]>({
    queryKey: ["/api/planes/community"],
    queryFn: () => apiFetch("/api/planes/community").then(r => r.json()),
  });

  const groups = useMemo(() => {
    const set = new Set(planes?.map(p => p.group) ?? []);
    return ["all", ...Array.from(set).sort()];
  }, [planes]);

  const types = useMemo(() => {
    const set = new Set(planes?.map(p => p.type) ?? []);
    return ["all", ...Array.from(set).sort()];
  }, [planes]);

  const filteredOfficial = useMemo(() => {
    let list = planes ?? [];
    if (groupFilter !== "all") list = list.filter(p => p.group === groupFilter);
    if (typeFilter !== "all") list = list.filter(p => p.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.creator.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [planes, groupFilter, typeFilter, search]);

  const filteredCommunity = useMemo(() => {
    if (!search.trim()) return communityPlanes;
    const q = search.toLowerCase();
    return communityPlanes.filter(g =>
      g.planeName.toLowerCase().includes(q) ||
      g.username.toLowerCase().includes(q) ||
      g.aiSummary.toLowerCase().includes(q)
    );
  }, [communityPlanes, search]);

  const isLoading = loadingPlanes || loadingCommunity;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-6">
        <h1 className="font-display font-900 text-2xl text-foreground flex items-center gap-3 mb-2">
          <Layers size={22} className="text-primary" />
          Plane Database
        </h1>
        <p className="text-muted-foreground text-sm">
          Official planes added by the admin, plus community-submitted designs approved for public display.
          Add your own from <Link href="/my-table"><span className="text-primary font-700 hover:underline">My Table</span></Link> → Submit.
        </p>
      </div>

      {/* Tab + search row */}
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <div className="flex rounded-xl overflow-hidden border border-border">
          {([["official", `Official (${planes?.length ?? 0})`], ["community", `Community (${communityPlanes.length})`]] as const).map(([v, label]) => (
            <button key={v} onClick={() => setTab(v)}
              className={cn("px-3 py-1.5 text-xs font-display font-700 transition-colors",
                tab === v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary")}>
              {label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search planes, creators..." className="pl-8 h-8 text-xs bg-background" />
        </div>

        {tab === "official" && (
          <>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue placeholder="Group" /></SelectTrigger>
              <SelectContent>{groups.map(g => <SelectItem key={g} value={g} className="text-xs">{g === "all" ? "All Groups" : g}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>{types.map(t => <SelectItem key={t} value={t} className="text-xs">{t === "all" ? "All Types" : t}</SelectItem>)}</SelectContent>
            </Select>
          </>
        )}

        <span className="text-xs text-muted-foreground ml-auto">
          {tab === "official" ? filteredOfficial.length : filteredCommunity.length} plane{(tab === "official" ? filteredOfficial.length : filteredCommunity.length) !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-56 rounded-2xl" />)}
        </div>
      ) : tab === "official" ? (
        filteredOfficial.length === 0 ? (
          <div className="text-center py-16">
            <Layers size={40} className="text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-display font-700 text-foreground mb-1">No official planes yet</h3>
            <p className="text-sm text-muted-foreground">The admin adds official planes. Check the Community tab for user submissions.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOfficial.map(plane => <PlaneCard key={plane.id} plane={plane} />)}
          </div>
        )
      ) : (
        filteredCommunity.length === 0 ? (
          <div className="text-center py-16">
            <Layers size={40} className="text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-display font-700 text-foreground mb-1">No community planes yet</h3>
            <p className="text-sm text-muted-foreground">
              Submit yours from <Link href="/my-table"><span className="text-primary font-700 hover:underline">My Table</span></Link> — choose "Plane Database" or "Both" when submitting.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCommunity.map(g => <CommunityPlaneCard key={g.id} g={g} />)}
          </div>
        )
      )}
    </div>
  );
}
