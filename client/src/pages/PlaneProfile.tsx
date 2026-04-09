import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/queryClient";
import { ArrowLeft, Trophy, Wind, Layers, BookOpen, Zap, Target, Star, ChevronRight, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlaneWithStats } from "@shared/schema";

function StatBlock({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="stat-card text-center">
      <div className="font-display font-900 text-xl text-foreground">{value}</div>
      {sub && <div className="text-[10px] text-primary mt-0.5">{sub}</div>}
      <div className="text-[11px] text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function ScoreBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-display font-700 text-foreground">{value.toFixed(0)}</span>
      </div>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function DifficultyStars({ level }: { level: number }) {
  return (
    <div className="flex gap-1.5 items-center">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={cn("w-3 h-3 rounded-sm", i <= level ? "bg-accent" : "bg-border")} />
      ))}
      <span className="text-xs text-muted-foreground ml-1">
        {level === 1 ? "Beginner" : level === 2 ? "Easy" : level === 3 ? "Intermediate" : level === 4 ? "Advanced" : "Expert"}
      </span>
    </div>
  );
}

export default function PlaneProfile() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: plane, isLoading } = useQuery<PlaneWithStats>({
    queryKey: ["/api/planes", slug],
    queryFn: () => apiFetch(`/api/planes/${slug}`).then(r => r.json()),
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="skeleton h-8 w-32 rounded-lg mb-6" />
        <div className="skeleton h-12 w-64 rounded-xl mb-4" />
        <div className="skeleton h-4 w-48 rounded mb-8" />
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!plane) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 text-center">
        <h1 className="font-display font-900 text-xl text-foreground mb-2">Plane not found</h1>
        <Link href="/planes" className="text-primary text-sm hover:underline">← Back to Planes</Link>
      </div>
    );
  }

  const rank = plane.stats?.rankPosition;
  const winPct = plane.stats?.winRate != null ? (plane.stats.winRate * 100).toFixed(0) + "%" : "—";
  const consistency = plane.stats?.consistencyScore != null ? plane.stats.consistencyScore.toFixed(0) : null;

  // Generate AI-like summary from stats
  const generateSummary = (): string => {
    if (!plane.stats || plane.stats.totalRaces === 0) {
      return `${plane.name} is a ${plane.type.toLowerCase()} plane crafted by ${plane.creator}. It has not yet entered any races, but its ${plane.flyingStyle.toLowerCase()} flying style suggests potential across multiple categories.`;
    }
    const { wins, totalRaces, winRate, avgFinish, consistencyScore, bestFinish, podiums } = plane.stats;
    const wr = ((winRate ?? 0) * 100).toFixed(0);
    const af = avgFinish?.toFixed(1) ?? "—";
    const cs = consistencyScore?.toFixed(0) ?? "—";

    let opening = `${plane.name} is a ${plane.type.toLowerCase()} plane designed by ${plane.creator}`;
    if (wins > 0 && winRate && winRate > 0.4) opening += `, and a genuine frontrunner in its category`;
    opening += ".";

    let performance = "";
    if (winRate && winRate >= 0.5) performance = `With a ${wr}% win rate across ${totalRaces} races, it is one of the most dominant performers in the field.`;
    else if (winRate && winRate >= 0.25) performance = `It has claimed victory in ${wr}% of its ${totalRaces} races — a respectable record that places it firmly in contention.`;
    else if (wins > 0) performance = `Though wins have been hard to come by (${wr}% win rate), ${plane.name} has shown flashes of brilliance.`;
    else performance = `With ${totalRaces} races completed, ${plane.name} is still finding its form.`;

    let consistency_str = "";
    if (consistencyScore && consistencyScore >= 75) consistency_str = `Its consistency score of ${cs} is among the highest in the competition — it rarely finishes outside of expectations.`;
    else if (consistencyScore && consistencyScore >= 50) consistency_str = `Averaging a finish of ${af}, it is a reliable mid-field performer that occasionally surges for big results.`;
    else consistency_str = `Its high-variance flight pattern (avg finish: ${af}) makes it an unpredictable wildcard — dangerous on a good day, streaky on a bad one.`;

    let outlook = plane.type === "Glider" ? `Its gliding style rewards smooth, patient throws.`
      : plane.type === "Speed" ? `Optimised for raw pace, it excels in straight-line speed events.`
      : plane.type === "Distance" ? `Built to cover ground, it is at its best in distance-focused rounds.`
      : plane.type === "Stunt" ? `Its acrobatic nature makes it unpredictable — a crowd favourite for good reason.`
      : `A well-rounded contender across multiple judging categories.`;

    return `${opening} ${performance} ${consistency_str} ${outlook}`;
  };

  const summary = plane.aiSummary || generateSummary();
  const steps = plane.tutorialSteps ?? [];

  const groupBadgeClass = plane.group === "A4" ? "group-a4" : plane.group === "XL" ? "group-xl" : plane.group === "XS" ? "group-xs" : "group-default";
  const typeBadgeClass = `type-${plane.type.toLowerCase()}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Back */}
      <Link href="/planes">
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Planes
        </button>
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={cn("group-badge", groupBadgeClass)}>{plane.group}</span>
            <span className={cn("type-badge", typeBadgeClass)}>{plane.type}</span>
            {rank && rank <= 3 && (
              <span className={cn("rank-badge text-[10px]", rank === 1 ? "rank-1" : rank === 2 ? "rank-2" : "rank-3")}>#{rank}</span>
            )}
          </div>
          <h1 className="font-display font-900 text-3xl text-foreground tracking-tight leading-tight mb-1">
            {plane.name}
          </h1>
          <p className="text-sm text-muted-foreground">by {plane.creator} · {plane.paperSize}</p>
        </div>

        {rank && (
          <div className="flex-shrink-0 text-center bg-card border border-border/60 rounded-xl p-4 min-w-[80px]">
            <div className={cn("rank-badge mx-auto mb-1 w-10 h-10 text-base", rank === 1 ? "rank-1" : rank === 2 ? "rank-2" : rank === 3 ? "rank-3" : "rank-other")}>
              #{rank}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Ranked</div>
          </div>
        )}
      </div>

      {/* Stats grid */}
      {plane.stats && plane.stats.totalRaces > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatBlock label="Total Points" value={plane.stats.totalPoints} />
          <StatBlock label="Wins" value={plane.stats.wins} sub={`${winPct} win rate`} />
          <StatBlock label="Races" value={plane.stats.totalRaces} sub={plane.stats.bestFinish != null ? `Best: #${plane.stats.bestFinish}` : "No results yet"} />
          <StatBlock label="Avg Finish" value={plane.stats.avgFinish?.toFixed(1) ?? "—"} sub={`${plane.stats.podiums} podium${plane.stats.podiums !== 1 ? "s" : ""}`} />
        </div>
      ) : (
        <div className="bg-muted/30 border border-border/40 rounded-xl p-4 mb-6 text-sm text-muted-foreground italic">
          This plane has not competed yet. Add race results in Admin to see stats here.
        </div>
      )}

      {/* Performance bars */}
      {consistency && (
        <div className="bg-card border border-border/60 rounded-xl p-5 mb-6 space-y-3">
          <h2 className="font-display font-700 text-sm text-foreground mb-3">Performance Profile</h2>
          <ScoreBar label="Consistency Score" value={parseFloat(consistency)} />
          {plane.stats?.winRate != null && <ScoreBar label="Win Rate" value={plane.stats.winRate * 100} />}
          {plane.stats?.podiums != null && plane.stats?.totalRaces && (
            <ScoreBar label="Podium Rate" value={(plane.stats.podiums / plane.stats.totalRaces) * 100} />
          )}
        </div>
      )}

      {/* AI Performance Summary */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={14} className="text-primary" />
          <h2 className="font-display font-700 text-sm text-primary">Performance Summary</h2>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">{summary}</p>
      </div>

      {/* Plane details */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-card border border-border/60 rounded-xl p-5">
          <h2 className="font-display font-700 text-sm text-foreground mb-3 flex items-center gap-2">
            <Wind size={14} className="text-primary" />
            Flight Details
          </h2>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Flying Style</dt>
              <dd className="font-500 text-foreground">{plane.flyingStyle}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Paper Size</dt>
              <dd className="font-500 text-foreground">{plane.paperSize}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-muted-foreground">Difficulty</dt>
              <dd><div className="flex gap-1">{[1,2,3,4,5].map(i => <span key={i} className={cn("w-2 h-2 rounded-sm", i <= plane.difficulty ? "bg-accent" : "bg-border")} />)}</div></dd>
            </div>
          </dl>
          {plane.throwingTips && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground leading-relaxed"><span className="text-foreground font-500">Throwing tip: </span>{plane.throwingTips}</p>
            </div>
          )}
        </div>

        {plane.description && (
          <div className="bg-card border border-border/60 rounded-xl p-5">
            <h2 className="font-display font-700 text-sm text-foreground mb-3">About</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{plane.description}</p>
          </div>
        )}
      </div>

      {/* Tutorial */}
      {steps.length > 0 && (
        <div className="bg-card border border-border/60 rounded-xl p-5 mb-6">
          <h2 className="font-display font-800 text-base text-foreground flex items-center gap-2 mb-5">
            <BookOpen size={16} className="text-primary" />
            Folding Tutorial
          </h2>
          <div className="space-y-5">
            {steps.map(step => (
              <div key={step.id} className="tutorial-step">
                <div className="tutorial-step-number">{step.stepNumber}</div>
                <div>
                  <h3 className="font-display font-700 text-sm text-foreground mb-1">{step.title}</h3>
                  <p className="text-sm text-foreground/80 leading-relaxed mb-2">{step.instruction}</p>
                  {step.tip && (
                    <div className="flex items-start gap-2 bg-accent/10 border border-accent/20 rounded-lg px-3 py-2">
                      <Star size={12} className="text-accent mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-foreground/70">{step.tip}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No tutorial */}
      {steps.length === 0 && (
        <div className="bg-muted/30 border border-border/40 rounded-xl p-5 text-center">
          <BookOpen size={28} className="text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No tutorial available yet. Add folding steps in the Admin panel.</p>
        </div>
      )}
    </div>
  );
}
