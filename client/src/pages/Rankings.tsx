import { useQuery } from "@tanstack/react-query";
import { Globe, Plane, Clock, Target, Calendar, Swords, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GlobalSubmission } from "@shared/schema";
import { Link } from "wouter";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function medal(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

function fmt(d: string) {
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
}

function LeaderboardTable({ entries }: { entries: GlobalSubmission[] }) {
  if (entries.length === 0) return (
    <div className="text-center py-20 bg-card border border-border/60 rounded-2xl">
      <Globe size={36} className="mx-auto mb-4 opacity-20 text-foreground" />
      <h3 className="font-display font-800 text-base text-foreground mb-2">No entries yet</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-5">
        Track your planes in My Table, then hit "Submit" to appear here.
      </p>
      <Link href="/my-table">
        <button className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-display font-700 hover:opacity-90 transition-opacity">
          Go to My Table
        </button>
      </Link>
    </div>
  );

  // Leaderboard-eligible entries only (not planes-only)
  const lb = entries.filter(e => e.submissionType !== "planes");

  return (
    <>
      {/* Top 3 podium */}
      {lb.length >= 1 && (
        <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: lb.length === 1 ? "1fr" : lb.length === 2 ? "1fr 1fr" : "1fr 1fr 1fr" }}>
          {lb.slice(0, Math.min(3, lb.length)).map((e, i) => (
            <div key={e.id} className={cn("bg-card border rounded-2xl p-4 text-center",
              i === 0 ? "border-[hsl(42_95%_55%/0.5)] bg-[hsl(42_95%_55%/0.05)]" :
              i === 1 ? "border-border/80 bg-muted/20" : "border-border/60")}>
              <div className="text-2xl mb-1">{medal(i + 1)}</div>
              <div className="font-display font-900 text-sm text-foreground truncate">{e.planeName}</div>
              <div className="text-xs text-muted-foreground truncate mb-2">by {e.username}</div>
              <div className="flex justify-center gap-3 text-xs">
                <span><span className="text-muted-foreground">Wins </span><span className="font-700 text-foreground">{e.wins}</span></span>
                <span><span className="text-muted-foreground">Races </span><span className="font-700 text-foreground">{e.totalRaces}</span></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full table */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr] px-4 py-2.5 border-b border-border/50 bg-muted/40">
          {["Rank", "Plane / Pilot", "Races", "Wins", "Avg pos.", "Win rate"].map(h => (
            <div key={h} className="text-[10px] font-700 text-muted-foreground uppercase tracking-wider">{h}</div>
          ))}
        </div>
        <div className="divide-y divide-border/40">
          {lb.map((e, i) => (
            <div key={e.id} className={cn("grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr] px-4 py-3 items-center hover:bg-muted/20 transition-colors", i < 3 && "bg-primary/[0.02]")}>
              <div className="text-sm font-display font-800 text-foreground w-10">{medal(i + 1)}</div>
              <div className="min-w-0">
                <div className="font-display font-700 text-sm text-foreground truncate">{e.planeName}</div>
                <div className="text-xs text-muted-foreground truncate flex items-center gap-1"><Plane size={10} />by {e.username}</div>
              </div>
              <div className="text-sm font-700 text-foreground">{e.totalRaces}</div>
              <div className="text-sm font-700 text-foreground">{e.wins}</div>
              <div className="text-sm text-foreground">{e.avgFinish != null ? e.avgFinish.toFixed(1) : "—"}</div>
              <div className="text-sm text-foreground">{e.winRate != null ? `${(e.winRate * 100).toFixed(0)}%` : "—"}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Distance & hangtime records */}
      {entries.some(e => e.bestDistanceMeters != null || e.bestHangtimeSeconds != null) && (
        <div className="mt-4 bg-card border border-border/60 rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/50 bg-muted/40">
            <span className="text-[10px] font-700 text-muted-foreground uppercase tracking-wider">Distance &amp; Hangtime records</span>
          </div>
          <div className="grid grid-cols-[auto_1fr_1fr_1fr] px-4 py-2 border-b border-border/30">
            {["Rank", "Plane / Pilot", "Best dist.", "Best hang"].map(h => (
              <div key={h} className="text-[10px] font-700 text-muted-foreground uppercase tracking-wider">{h}</div>
            ))}
          </div>
          <div className="divide-y divide-border/40">
            {[...entries]
              .filter(e => e.bestDistanceMeters != null || e.bestHangtimeSeconds != null)
              .sort((a, b) => (b.bestDistanceMeters ?? 0) - (a.bestDistanceMeters ?? 0))
              .map((e, i) => (
                <div key={e.id} className="grid grid-cols-[auto_1fr_1fr_1fr] px-4 py-3 items-center hover:bg-muted/20 transition-colors">
                  <div className="text-sm font-700 text-foreground w-10">#{i + 1}</div>
                  <div className="min-w-0">
                    <div className="font-display font-700 text-sm text-foreground truncate">{e.planeName}</div>
                    <div className="text-xs text-muted-foreground truncate">by {e.username}</div>
                  </div>
                  <div className="text-sm font-700 text-foreground flex items-center gap-1">
                    <Target size={12} className="text-muted-foreground" />
                    {e.bestDistanceMeters != null ? `${e.bestDistanceMeters.toFixed(1)} m` : "—"}
                  </div>
                  <div className="text-sm font-700 text-foreground flex items-center gap-1">
                    <Clock size={12} className="text-muted-foreground" />
                    {e.bestHangtimeSeconds != null ? `${e.bestHangtimeSeconds.toFixed(1)} s` : "—"}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </>
  );
}

function HeadToHead({ entries }: { entries: GlobalSubmission[] }) {
  const lbEntries = entries.filter(e => e.submissionType !== "planes");
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");

  const left = lbEntries.find(e => String(e.id) === leftId);
  const right = lbEntries.find(e => String(e.id) === rightId);

  function StatRow({ label, leftVal, rightVal, lowerIsBetter = false }: { label: string; leftVal: number | null; rightVal: number | null; lowerIsBetter?: boolean }) {
    const lv = leftVal ?? 0;
    const rv = rightVal ?? 0;
    const leftWins = lowerIsBetter ? lv < rv : lv > rv;
    const rightWins = lowerIsBetter ? rv < lv : rv > lv;
    const tie = lv === rv;
    return (
      <div className="grid grid-cols-3 items-center py-2.5 border-b border-border/30 last:border-0">
        <div className={cn("text-sm font-700 text-right pr-4", tie ? "text-muted-foreground" : leftWins ? "text-primary" : "text-muted-foreground")}>
          {leftVal != null ? (label.includes("%") || label.includes("rate") ? `${(lv*100).toFixed(0)}%` : label.includes("pos") ? `#${lv}` : lv % 1 === 0 ? lv : lv.toFixed(1)) : "—"}
          {!tie && leftWins && <span className="ml-1 text-[10px]">▲</span>}
        </div>
        <div className="text-center text-[10px] font-700 text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className={cn("text-sm font-700 text-left pl-4", tie ? "text-muted-foreground" : rightWins ? "text-primary" : "text-muted-foreground")}>
          {!tie && rightWins && <span className="mr-1 text-[10px]">▲</span>}
          {rightVal != null ? (label.includes("%") || label.includes("rate") ? `${(rv*100).toFixed(0)}%` : label.includes("pos") ? `#${rv}` : rv % 1 === 0 ? rv : rv.toFixed(1)) : "—"}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-5 mb-6">
      <h2 className="font-display font-800 text-sm text-foreground flex items-center gap-2 mb-4">
        <Swords size={14} className="text-primary" /> Head-to-Head Comparison
      </h2>

      {lbEntries.length < 2 ? (
        <p className="text-xs text-muted-foreground">Need at least 2 approved entries to compare.</p>
      ) : (
        <>
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center mb-4">
            <Select value={leftId} onValueChange={setLeftId}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pick a plane…" /></SelectTrigger>
              <SelectContent>{lbEntries.map(e => <SelectItem key={e.id} value={String(e.id)} className="text-xs">{e.planeName} · {e.username}</SelectItem>)}</SelectContent>
            </Select>
            <div className="text-xs font-700 text-muted-foreground px-1">VS</div>
            <Select value={rightId} onValueChange={setRightId}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pick a plane…" /></SelectTrigger>
              <SelectContent>{lbEntries.map(e => <SelectItem key={e.id} value={String(e.id)} className="text-xs">{e.planeName} · {e.username}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {left && right ? (
            <div className="bg-muted/30 rounded-xl p-4">
              {/* Plane names header */}
              <div className="grid grid-cols-3 mb-3">
                <div className="text-center">
                  <div className="font-display font-800 text-sm text-foreground">{left.planeName}</div>
                  <div className="text-xs text-muted-foreground">by {left.username}</div>
                </div>
                <div />
                <div className="text-center">
                  <div className="font-display font-800 text-sm text-foreground">{right.planeName}</div>
                  <div className="text-xs text-muted-foreground">by {right.username}</div>
                </div>
              </div>
              <StatRow label="Races" leftVal={left.totalRaces} rightVal={right.totalRaces} />
              <StatRow label="Wins" leftVal={left.wins} rightVal={right.wins} />
              <StatRow label="Avg pos." leftVal={left.avgFinish} rightVal={right.avgFinish} lowerIsBetter />
              <StatRow label="Win rate" leftVal={left.winRate} rightVal={right.winRate} />
              <StatRow label="Best dist." leftVal={left.bestDistanceMeters} rightVal={right.bestDistanceMeters} />
              <StatRow label="Best hang" leftVal={left.bestHangtimeSeconds} rightVal={right.bestHangtimeSeconds} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Select two planes above to compare them.</p>
          )}
        </>
      )}
    </div>
  );
}

export default function Rankings() {
  const [tab, setTab] = useState<"alltime" | "weekly">("alltime");

  const { data: allEntries = [], isLoading } = useQuery<GlobalSubmission[]>({
    queryKey: ["/api/global"],
  });

  // Weekly: submitted in the last 7 days
  const weeklyEntries = allEntries.filter(e => {
    const d = new Date(e.submittedAt);
    return !isNaN(d.getTime()) && (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
  });

  const entries = tab === "weekly" ? weeklyEntries : allEntries;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Globe size={18} className="text-primary" />
          <span className="text-xs font-700 text-primary uppercase tracking-wider">Global Leaderboard</span>
        </div>
        <h1 className="font-display font-900 text-2xl text-foreground mb-2">World Rankings</h1>
        <p className="text-sm text-muted-foreground max-w-lg">
          Pilots voluntarily submit their best stats. Approved entries appear here.
          Track in <Link href="/my-table"><span className="text-primary hover:underline cursor-pointer font-700">My Table</span></Link>, then submit.
        </p>
      </div>

      {/* Tab toggle */}
      <div className="flex rounded-xl overflow-hidden border border-border mb-6 w-fit">
        {([["alltime", "All Time"], ["weekly", "This Week"]] as const).map(([v, label]) => (
          <button key={v} onClick={() => setTab(v)}
            className={cn("px-4 py-2 text-xs font-display font-700 flex items-center gap-1.5 transition-colors",
              tab === v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary")}>
            {v === "weekly" && <Calendar size={11} />}
            {label}
            {v === "weekly" && weeklyEntries.length > 0 && (
              <span className="ml-1 bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-[10px] font-700">{weeklyEntries.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "weekly" && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5 mb-5 text-xs text-muted-foreground">
          Showing entries submitted in the last 7 days. Re-submitting from My Table resets your entry to pending.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
      ) : (
        <>
          <LeaderboardTable entries={entries} />
          {allEntries.length >= 2 && (
            <div className="mt-6">
              <HeadToHead entries={allEntries} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
