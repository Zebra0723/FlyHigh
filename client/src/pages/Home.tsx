import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Trophy, BookOpen, Layers, ArrowRight, Zap, Target, Star, Pin } from "lucide-react";
import { apiRequest, apiFetch } from "@/lib/queryClient";
import { LeaderboardRow } from "@/components/PlaneCard";
import { cn } from "@/lib/utils";
import type { PlaneWithStats, CompetitionSettings } from "@shared/schema";

function StatPill({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2">
      <Icon size={14} className="text-primary" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-display font-700 text-foreground">{value}</span>
    </div>
  );
}

export default function Home() {
  const { data: leaderboard } = useQuery<PlaneWithStats[]>({
    queryKey: ["/api/leaderboard"],
  });
  const { data: planes } = useQuery<PlaneWithStats[]>({
    queryKey: ["/api/planes"],
  });
  const { data: adminPosts = [] } = useQuery<any[]>({
    queryKey: ["/api/featured"],
    queryFn: () => apiFetch("/api/featured").then(r => r.json()),
  });

  const { data: settings } = useQuery<CompetitionSettings>({
    queryKey: ["/api/settings"],
  });

  const top3 = leaderboard?.slice(0, 3) ?? [];
  const featured = planes?.filter(p => p.featured).slice(0, 3) ?? [];
  const totalPlanes = planes?.length ?? 0;
  const totalWins = leaderboard?.reduce((s, p) => s + (p.stats?.wins ?? 0), 0) ?? 0;
  const totalRaces = leaderboard?.reduce((s, p) => s + (p.stats?.totalRaces ?? 0), 0) ?? 0;

  return (
    <div className="hero-gradient">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-12 relative overflow-hidden">
        {/* Floating plane decoration */}
        <div className="absolute right-4 top-8 opacity-20 pointer-events-none select-none hidden lg:block float-plane">
          <svg viewBox="0 0 160 120" width="200" fill="none">
            <path d="M8 60 L152 20 L90 140 L70 90 Z" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinejoin="round" fill="hsl(var(--primary) / 0.3)" />
            <path d="M70 90 L152 20" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="6 4" />
            <circle cx="152" cy="20" r="6" fill="hsl(var(--accent))" />
          </svg>
        </div>

        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-display font-700 text-primary tracking-wide uppercase">
              {settings?.name ?? "FlyHigh Championships"}
            </span>
          </div>

          <h1 className="font-display font-900 text-4xl sm:text-5xl text-foreground mb-4 leading-tight tracking-tight">
            Where Planes{" "}
            <span className="text-primary">Fly High</span>{" "}
            &amp; Champions Rise
          </h1>

          <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-2xl">
            Track rankings, discover planes, and master folding techniques — the ultimate platform for serious paper plane competition.
          </p>

          {/* Stats pills */}
          <div className="flex flex-wrap gap-2 mb-8">
            <StatPill icon={Layers} label="Planes" value={totalPlanes} />
            <StatPill icon={Trophy} label="Races logged" value={Math.ceil(totalRaces / 2)} />
            <StatPill icon={Zap} label="Total wins" value={totalWins} />
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/rankings">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-display font-700 text-sm hover:opacity-90 transition-opacity" data-testid="hero-cta-rankings">
                <Trophy size={16} />
                View Rankings
              </button>
            </Link>
            <Link href="/planes">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-muted text-foreground font-display font-700 text-sm hover:bg-secondary transition-colors border border-border" data-testid="hero-cta-planes">
                <Layers size={16} />
                Browse Planes
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Top 3 podium ────────────────────────────────────────────────────── */}
      {top3.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-800 text-lg text-foreground flex items-center gap-2">
              <Trophy size={18} className="text-accent" />
              Current Standings
            </h2>
            <Link href="/rankings" className="flex items-center gap-1 text-xs text-primary hover:underline font-display font-700">
              Full leaderboard <ArrowRight size={12} />
            </Link>
          </div>

          {/* Podium visual */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {top3.map((plane, i) => {
              const rank = i + 1;
              const heights = ["h-24", "h-16", "h-12"];
              const barColors = ["bg-yellow-400", "bg-gray-400", "bg-amber-600"];
              const podiumH = heights[i] ?? "h-12";
              const podiumC = barColors[i] ?? "bg-gray-400";
              return (
                <Link key={plane.id} href={`/planes/${plane.slug}`}>
                  <div className={`flex flex-col items-center gap-2 group cursor-pointer`}>
                    <div className="text-center">
                      <div className="text-xs font-display font-700 text-foreground group-hover:text-primary transition-colors truncate max-w-[100px]">{plane.name}</div>
                      <div className="text-[10px] text-muted-foreground">{plane.stats?.totalPoints ?? 0} pts</div>
                    </div>
                    <div className={`w-full ${podiumH} ${podiumC} rounded-t-lg opacity-70 group-hover:opacity-90 transition-opacity flex items-start justify-center pt-2`}>
                      <span className="font-display font-900 text-white text-xl">#{rank}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Leaderboard list */}
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden divide-y divide-border/40">
            {top3.map((plane, i) => (
              <LeaderboardRow key={plane.id} plane={plane} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* ── Feature tiles ────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 section-divider">
        {/* Featured Posts */}
        {adminPosts.length > 0 && (
          <div className="mb-10">
            <h2 className="font-display font-800 text-lg text-foreground mb-4 flex items-center gap-2">
              <Star size={18} className="text-primary" /> From the admin
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {adminPosts.map((p: any) => {
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
                  <div key={p.id} className={cn("bg-card border rounded-2xl p-4 flex items-start gap-3",
                    p.pinned ? "border-primary/30 bg-primary/[0.02]" : "border-border/60")}>
                    {p.pinned && <Pin size={12} className="text-primary mt-1 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={cn("text-[10px] font-700 px-2 py-0.5 rounded-full", badgeColors[p.badge] ?? "bg-muted text-muted-foreground")}>{p.badge}</span>
                        <span className="font-display font-700 text-sm text-foreground">{p.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-3">{p.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <h2 className="font-display font-800 text-lg text-foreground mb-5">What's inside</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              icon: Trophy, title: "Live Rankings", color: "text-yellow-400",
              desc: "Auto-updating leaderboards with filters by group, type, and performance metric. No spreadsheets required.",
              href: "/rankings", cta: "See Rankings",
            },
            {
              icon: Layers, title: "Plane Database", color: "text-sky-400",
              desc: "Every plane has its own profile: stats, results history, AI performance summary, and folding guide.",
              href: "/planes", cta: "Browse Planes",
            },
            {
              icon: BookOpen, title: "Tutorials", color: "text-emerald-400",
              desc: "Step-by-step folding guides with tips, difficulty ratings, and flying instructions for every plane.",
              href: "/tutorials", cta: "Start Folding",
            },
          ].map(({ icon: Icon, title, color, desc, href, cta }) => (
            <Link key={href} href={href}>
              <div className="bg-card border border-border/60 rounded-2xl p-5 hover:border-primary/30 transition-all group cursor-pointer h-full flex flex-col">
                <Icon size={22} className={`${color} mb-3`} />
                <h3 className="font-display font-800 text-sm text-foreground mb-2 group-hover:text-primary transition-colors">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed flex-1">{desc}</p>
                <div className="flex items-center gap-1 text-xs text-primary font-700 mt-4">
                  {cta} <ArrowRight size={12} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Featured planes ──────────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 section-divider">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-800 text-lg text-foreground flex items-center gap-2">
              <Star size={16} className="text-accent" />
              Featured Planes
            </h2>
            <Link href="/planes" className="flex items-center gap-1 text-xs text-primary hover:underline font-display font-700">
              All planes <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {featured.map(plane => (
              <Link key={plane.id} href={`/planes/${plane.slug}`}>
                <div className="bg-card border border-border/60 rounded-2xl p-5 hover:border-primary/40 transition-all group cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-display font-800 text-sm text-foreground group-hover:text-primary transition-colors">{plane.name}</h3>
                    <span className={`type-badge type-${plane.type.toLowerCase()} text-[10px]`}>{plane.type}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed line-clamp-2">{plane.description}</p>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">by {plane.creator}</span>
                    {plane.stats && (
                      <span className="text-primary font-700">{plane.stats.totalPoints} pts</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
