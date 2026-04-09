import { Link } from "wouter";
import { Trophy, Wind, Star, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlaneWithStats } from "@shared/schema";

function RankBadge({ rank }: { rank: number | null | undefined }) {
  if (!rank) return null;
  const cls = rank === 1 ? "rank-1" : rank === 2 ? "rank-2" : rank === 3 ? "rank-3" : "rank-other";
  return <span className={cn("rank-badge", cls)}>#{rank}</span>;
}

function GroupBadge({ group }: { group: string }) {
  const cls = group === "A4" ? "group-a4" : group === "XL" ? "group-xl" : group === "XS" ? "group-xs" : "group-default";
  return <span className={cn("group-badge", cls)}>{group}</span>;
}

function TypeBadge({ type }: { type: string }) {
  const t = type.toLowerCase();
  const cls = t === "glider" ? "type-glider" : t === "distance" ? "type-distance" : t === "stunt" ? "type-stunt" : t === "speed" ? "type-speed" : t === "acrobatic" ? "type-acrobatic" : "type-default";
  return <span className={cn("type-badge", cls)}>{type}</span>;
}

function Difficulty({ level }: { level: number }) {
  return (
    <div className="flex gap-1 items-center">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={cn("difficulty-dot", i <= level ? "filled" : "empty")} />
      ))}
    </div>
  );
}

export function PlaneCard({ plane }: { plane: PlaneWithStats }) {
  const winPct = plane.stats?.winRate != null ? Math.round(plane.stats.winRate * 100) : null;

  return (
    <Link href={`/planes/${plane.slug}`} data-testid={`card-plane-${plane.id}`}>
      <div className="bg-card border border-border/60 rounded-2xl p-5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 group cursor-pointer h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-800 text-base text-foreground group-hover:text-primary transition-colors truncate leading-tight">
              {plane.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">by {plane.creator}</p>
          </div>
          <RankBadge rank={plane.stats?.rankPosition} />
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <GroupBadge group={plane.group} />
          <TypeBadge type={plane.type} />
        </div>

        {/* Description */}
        {plane.description && (
          <p className="text-xs text-muted-foreground leading-relaxed mb-3 flex-1 line-clamp-2">
            {plane.description}
          </p>
        )}

        {/* Stats row */}
        {plane.stats ? (
          <div className="grid grid-cols-3 gap-2 mt-auto pt-3 border-t border-border/50">
            <div className="text-center">
              <div className="text-base font-display font-800 text-foreground">{plane.stats.wins}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Wins</div>
            </div>
            <div className="text-center">
              <div className="text-base font-display font-800 text-foreground">{plane.stats.totalPoints}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Points</div>
            </div>
            <div className="text-center">
              <div className="text-base font-display font-800 text-foreground">
                {winPct != null ? `${winPct}%` : "—"}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Win Rate</div>
            </div>
          </div>
        ) : (
          <div className="mt-auto pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground italic">No race data yet</p>
          </div>
        )}

        {/* Difficulty */}
        <div className="flex items-center justify-between mt-3">
          <Difficulty level={plane.difficulty} />
          <span className="text-[10px] text-muted-foreground">{plane.paperSize}</span>
        </div>
      </div>
    </Link>
  );
}

export function LeaderboardRow({ plane, index }: { plane: PlaneWithStats; index: number }) {
  const rank = plane.stats?.rankPosition ?? index + 1;
  const badgeClass = rank === 1 ? "rank-1" : rank === 2 ? "rank-2" : rank === 3 ? "rank-3" : "rank-other";

  return (
    <Link href={`/planes/${plane.slug}`} data-testid={`row-plane-${plane.id}`}>
      <div className="leaderboard-row">
        {/* Rank */}
        <span className={cn("rank-badge flex-shrink-0", badgeClass)}>#{rank}</span>

        {/* Plane info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-700 text-sm text-foreground truncate">{plane.name}</span>
            <span className={cn("group-badge text-[10px]", plane.group === "A4" ? "group-a4" : plane.group === "XL" ? "group-xl" : plane.group === "XS" ? "group-xs" : "group-default")}>
              {plane.group}
            </span>
            <span className={cn("type-badge text-[10px]", `type-${plane.type.toLowerCase()}`)}>
              {plane.type}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">by {plane.creator}</div>
        </div>

        {/* Stats */}
        <div className="hidden sm:grid grid-cols-4 gap-4 text-center flex-shrink-0">
          <div>
            <div className="text-sm font-display font-800 text-foreground">{plane.stats?.totalPoints ?? 0}</div>
            <div className="text-[10px] text-muted-foreground">PTS</div>
          </div>
          <div>
            <div className="text-sm font-display font-800 text-foreground">{plane.stats?.wins ?? 0}</div>
            <div className="text-[10px] text-muted-foreground">WINS</div>
          </div>
          <div>
            <div className="text-sm font-display font-800 text-foreground">{plane.stats?.totalRaces ?? 0}</div>
            <div className="text-[10px] text-muted-foreground">RACES</div>
          </div>
          <div>
            <div className="text-sm font-display font-800 text-foreground">
              {plane.stats?.avgFinish != null ? plane.stats.avgFinish.toFixed(1) : "—"}
            </div>
            <div className="text-[10px] text-muted-foreground">AVG</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
