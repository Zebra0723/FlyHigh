import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { BookOpen, Search, ArrowRight, Users, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TutorialStepEditor from "@/components/TutorialStepEditor";
import { cn } from "@/lib/utils";
import type { PlaneWithStats, CommunityDesign, TutorialStepData } from "@shared/schema";

function DifficultyLabel({ d }: { d: number }) {
  const labels = ["", "Beginner", "Easy", "Intermediate", "Advanced", "Expert"];
  const colors = ["", "text-emerald-400", "text-sky-400", "text-amber-400", "text-orange-400", "text-rose-400"];
  return <span className={cn("text-xs font-500", colors[d] ?? "text-muted-foreground")}>{labels[d] ?? "—"}</span>;
}

function DotRating({ d }: { d: number }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={cn("w-1.5 h-1.5 rounded-sm", i <= d ? "bg-accent" : "bg-border")} />
      ))}
    </div>
  );
}

function OfficialTutorialCard({ plane }: { plane: PlaneWithStats }) {
  const hasSteps = (plane.tutorialSteps?.length ?? 0) > 0;
  return (
    <Link href={`/planes/${plane.slug}`}>
      <div className={cn(
        "bg-card border rounded-2xl p-5 transition-all group cursor-pointer h-full flex flex-col",
        hasSteps ? "border-border/60 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                 : "border-dashed border-border/40 opacity-60"
      )}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-800 text-sm text-foreground group-hover:text-primary transition-colors leading-tight truncate">{plane.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">by {plane.creator}</p>
          </div>
          <div className="flex-shrink-0 ml-2">
            <DotRating d={plane.difficulty} />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={cn("group-badge text-[10px]", plane.group==="A4"?"group-a4":plane.group==="XL"?"group-xl":plane.group==="XS"?"group-xs":"group-default")}>{plane.group}</span>
          <span className={cn("type-badge text-[10px]", `type-${plane.type.toLowerCase()}`)}>{plane.type}</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground">
            {plane.paperSize}
          </span>
        </div>

        {hasSteps ? (
          <div className="mt-auto flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{plane.tutorialSteps!.length} steps</span>
            <span className="flex items-center gap-1 text-xs text-primary font-700">
              View guide <ArrowRight size={11} />
            </span>
          </div>
        ) : null}
      </div>
    </Link>
  );
}

function CommunityCard({ design }: { design: CommunityDesign }) {
  const [expanded, setExpanded] = useState(false);
  const steps: TutorialStepData[] = (() => {
    try { return JSON.parse(design.steps || "[]"); } catch { return []; }
  })();

  return (
    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
      <button
        type="button"
        className="w-full text-left p-5"
        onClick={() => setExpanded(!expanded)}
        data-testid={`community-design-${design.id}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display font-800 text-sm text-foreground leading-tight">{design.name}</h3>
              <span className={cn("type-badge text-[10px]", `type-${design.type.toLowerCase()}`)}>{design.type}</span>
            </div>
            <p className="text-xs text-muted-foreground">by {design.authorName} · {design.paperSize} · <DifficultyLabel d={design.difficulty} /></p>
          </div>
          <div className="flex-shrink-0 text-xs text-muted-foreground">{steps.length} step{steps.length !== 1 ? "s" : ""}</div>
        </div>
        {design.description && (
          <p className="text-xs text-muted-foreground/80 mt-2 leading-relaxed line-clamp-2">{design.description}</p>
        )}
        <div className="mt-3 text-xs text-primary font-700 flex items-center gap-1">
          {expanded ? "Collapse" : "View tutorial"} <ArrowRight size={11} className={cn("transition-transform", expanded ? "rotate-90" : "")} />
        </div>
      </button>

      {expanded && steps.length > 0 && (
        <div className="border-t border-border/50 px-5 pb-5 pt-4">
          {design.throwingTips && (
            <div className="mb-4 flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2.5">
              <Star size={12} className="text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-foreground/80"><span className="font-600 text-foreground">Throwing tip: </span>{design.throwingTips}</p>
            </div>
          )}
          <TutorialStepEditor steps={steps} onChange={() => {}} readOnly />
        </div>
      )}
    </div>
  );
}

export default function Tutorials() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [diffFilter, setDiffFilter] = useState("all");

  const { data: planes, isLoading: planesLoading } = useQuery<PlaneWithStats[]>({ queryKey: ["/api/planes"] });
  const { data: community, isLoading: commLoading } = useQuery<CommunityDesign[]>({ queryKey: ["/api/community/designs"] });

  const types = useMemo(() => {
    const s = new Set([...(planes?.map(p => p.type) ?? []), ...(community?.map(c => c.type) ?? [])]);
    return ["all", ...Array.from(s).sort()];
  }, [planes, community]);

  const filterFn = (name: string, type: string, difficulty: number) => {
    if (typeFilter !== "all" && type !== typeFilter) return false;
    if (diffFilter !== "all" && difficulty !== +diffFilter) return false;
    if (search.trim() && !name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  };

  const filteredPlanes = (planes ?? []).filter(p => filterFn(p.name, p.type, p.difficulty));
  const filteredCommunity = (community ?? []).filter(c => filterFn(c.name, c.type, c.difficulty));

  const withTutorial = filteredPlanes.filter(p => (p.tutorialSteps?.length ?? 0) > 0);
  const withoutTutorial = filteredPlanes.filter(p => (p.tutorialSteps?.length ?? 0) === 0);

  const Filters = () => (
    <div className="flex flex-wrap gap-3 items-center mb-6 p-4 bg-card border border-border/60 rounded-xl">
      <div className="relative flex-1 min-w-[180px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tutorials…" className="pl-8 h-8 text-xs bg-background" data-testid="search-tutorials" />
      </div>
      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
        <SelectContent>{types.map(t => <SelectItem key={t} value={t} className="text-xs">{t === "all" ? "All Types" : t}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={diffFilter} onValueChange={setDiffFilter}>
        <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Difficulty" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">All Levels</SelectItem>
          {[1,2,3,4,5].map(d => <SelectItem key={d} value={String(d)} className="text-xs">{["","Beginner","Easy","Intermediate","Advanced","Expert"][d]}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display font-900 text-2xl text-foreground flex items-center gap-3 mb-2">
            <BookOpen size={22} className="text-primary" /> Tutorials
          </h1>
          <p className="text-muted-foreground text-sm">Step-by-step picture guides for every plane. Official guides below, plus community-submitted designs.</p>
        </div>
        <Link href="/submit">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-display font-700 hover:opacity-90 transition-opacity flex-shrink-0" data-testid="submit-design-btn">
            <Users size={14} /> Submit Your Design
          </button>
        </Link>
      </div>

      <Tabs defaultValue="official">
        <TabsList className="mb-6 bg-muted">
          <TabsTrigger value="official" className="font-display font-700 text-xs">
            Official Guides ({withTutorial.length})
          </TabsTrigger>
          <TabsTrigger value="community" className="font-display font-700 text-xs">
            Community Designs ({filteredCommunity.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="official">
          <Filters />
          {planesLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-40 rounded-2xl" />)}</div>
          ) : withTutorial.length === 0 && withoutTutorial.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen size={40} className="text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-display font-700 text-foreground mb-1">No results</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <>
              {withTutorial.length > 0 && (
                <div className="mb-8">
                  <h2 className="font-display font-700 text-xs text-muted-foreground uppercase tracking-wider mb-3">Ready to fold</h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {withTutorial.map(p => <OfficialTutorialCard key={p.id} plane={p} />)}
                  </div>
                </div>
              )}

            </>
          )}
        </TabsContent>

        <TabsContent value="community">
          <Filters />
          {commLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
          ) : filteredCommunity.length === 0 ? (
            <div className="text-center py-16">
              <Users size={40} className="text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-display font-700 text-foreground mb-1">No community designs yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Be the first to share your own plane design.</p>
              <Link href="/submit">
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-display font-700 hover:opacity-90 transition-opacity">Submit Your Design</button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCommunity.map(d => <CommunityCard key={d.id} design={d} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
