import { useState, useMemo, useEffect } from "react";
import { Eye, Star, Zap, Play } from "lucide-react";
import { ESPNEvent } from "@/lib/api";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface EventCardProps {
  event: ESPNEvent;
  leagueInfo: { key: string; name: string; sub: string; logo?: string };
  hasLink: boolean;
  isResolving?: boolean;
  isFavorite: boolean;
  isFeatured?: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
  formatTime: (iso: string) => string;
}

type TeamData = ESPNEvent["competitions"][number]["competitors"][number]["team"];

function getSportSegment(leagueKey: string) {
  if (["nba", "wnba", "ncaab"].includes(leagueKey)) return "nba";
  if (leagueKey.startsWith("mlb")) return "mlb";
  if (leagueKey === "nhl") return "nhl";
  if (leagueKey === "ufc" || leagueKey === "boxing" || leagueKey === "wwe") return "mma";
  return "soccer";
}

function getTeamLogoCandidates(team: TeamData | undefined, leagueKey: string): string[] {
  if (!team) return [];
  const sport = getSportSegment(leagueKey);
  const candidates: string[] = [];
  if (team.logo) candidates.push(team.logo);
  if (team.id) {
    candidates.push(`https://a.espncdn.com/i/teamlogos/${sport}/500/${team.id}.png`);
    candidates.push(`https://a.espncdn.com/i/teamlogos/${sport}/500-dark/${team.id}.png`);
    candidates.push(`https://a.espncdn.com/combiner/i?img=/i/teamlogos/${sport}/500/${team.id}.png&h=100&w=100`);
  }
  return candidates;
}

const teamSearchCache = new Map<string, string | null>();

async function searchTeamLogoFromESPN(teamName: string): Promise<string | null> {
  if (!teamName) return null;
  const key = teamName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (teamSearchCache.has(key)) return teamSearchCache.get(key) || null;
  const queries = Array.from(
    new Set([
      teamName,
      teamName.replace(/\b(Baseball|Basketball|Football|Hockey|Rugby)\b/gi, "").trim(),
      teamName.replace(/\b(Fc|CF|SC|SK|AC|Club)\b/gi, "").trim(),
    ].filter(Boolean)),
  );
  for (const q of queries) {
    try {
      const { data, error } = await supabase.functions.invoke("team-logo-search", { body: { t: q } });
      if (error) continue;
      const logo = data?.logo || null;
      if (logo) { teamSearchCache.set(key, logo); return logo; }
    } catch { /* continue */ }
  }
  teamSearchCache.set(key, null);
  return null;
}

function TeamLogo({ team, leagueKey, size = "md" }: { team: TeamData | undefined; leagueKey: string; size?: "sm" | "md" }) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [searchedLogo, setSearchedLogo] = useState<string | null>(null);
  const [searchTried, setSearchTried] = useState(false);
  const baseLogos = useMemo(() => getTeamLogoCandidates(team, leagueKey), [team, leagueKey]);
  const logos = useMemo(() => (searchedLogo ? [...baseLogos, searchedLogo] : baseLogos), [baseLogos, searchedLogo]);
  const logoUrl = logos[candidateIndex];
  const abbr = (team?.abbreviation || team?.shortDisplayName || "?").slice(0, 3);
  const sizeClasses = size === "sm" ? "w-10 h-10" : "w-14 h-14 sm:w-16 sm:h-16";

  useEffect(() => {
    let cancelled = false;
    if (searchTried || searchedLogo || logoUrl) return;
    const name = team?.displayName || team?.shortDisplayName;
    if (!name) return;
    setSearchTried(true);
    searchTeamLogoFromESPN(name).then((url) => { if (!cancelled && url) setSearchedLogo(url); });
    return () => { cancelled = true; };
  }, [logoUrl, searchedLogo, searchTried, team?.displayName, team?.shortDisplayName]);

  if (logoUrl) {
    return (
      <div className="relative">
        <div className="absolute inset-0 blur-2xl opacity-30 scale-[2]">
          <img src={logoUrl} alt="" className="w-full h-full object-contain" loading="lazy" />
        </div>
        <img
          src={logoUrl}
          alt={team?.displayName || ""}
          className={cn("relative object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]", sizeClasses)}
          onError={() => setCandidateIndex((prev) => prev + 1)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl flex items-center justify-center font-display text-foreground/50 text-sm bg-white/[0.06] border border-white/[0.08]", sizeClasses)}>
      {abbr}
    </div>
  );
}

export function EventCard({
  event,
  leagueInfo,
  hasLink,
  isResolving,
  isFavorite,
  onToggleFavorite,
  onClick,
  formatTime,
}: EventCardProps) {
  const comp = event.competitions?.[0];
  const status = comp?.status?.type;
  const isLive = status?.state === "in";
  const isFinal = status?.state === "post";
  const isPre = status?.state === "pre";
  const competitors = comp?.competitors || [];
  const away = competitors.find((c) => c.homeAway === "away") || competitors[0];
  const home = competitors.find((c) => c.homeAway === "home") || competitors[1];

  const awayColor = away?.team?.color ? `#${away.team.color}` : "#111";
  const homeColor = home?.team?.color ? `#${home.team.color}` : "#111";

  let timeText = "";
  if (isLive) {
    const period = comp?.status?.period ? `Q${comp.status.period}` : "";
    const clock = comp?.status?.displayClock || "";
    timeText = [period, clock].filter(Boolean).join(" · ");
  } else if (isFinal) {
    timeText = status?.shortDetail || "Final";
  } else {
    timeText = formatTime(comp?.date || event.date);
  }

  const viewers = useMemo(() => (isLive ? Math.floor(Math.random() * 15000) + 500 : 0), [isLive]);
  const awayScore = away?.score;
  const homeScore = home?.score;
  const showScore = (isLive || isFinal) && awayScore !== undefined && homeScore !== undefined;

  return (
    <div
      className={cn(
        "group/card relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300",
        "bg-[#0a0a0a] border hover:shadow-2xl hover:shadow-black/60",
        "hover:-translate-y-1 hover:scale-[1.02]",
        isLive
          ? "border-primary/30 hover:border-primary/50 ring-1 ring-primary/10"
          : isPre
            ? "border-white/[0.06] hover:border-white/[0.12]"
            : "border-white/[0.04] hover:border-white/[0.08] opacity-60 hover:opacity-80",
      )}
      onClick={onClick}
    >
      {/* Match visual area */}
      <div
        className="relative aspect-[16/9] overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${awayColor}40 0%, #0a0a0a 50%, ${homeColor}40 100%)`,
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_#0a0a0a_100%)] pointer-events-none" />

        {/* Status badges */}
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
          {isLive && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-destructive shadow-lg shadow-destructive/40">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
              </span>
              <span className="text-[9px] font-black text-white tracking-[0.2em]">LIVE</span>
            </div>
          )}
          {isPre && (
            <div className="px-2.5 py-1 rounded-md bg-white/[0.06] backdrop-blur-sm">
              <span className="text-[9px] font-mono-premium font-medium text-white/60">{timeText}</span>
            </div>
          )}
          {isFinal && (
            <div className="px-2.5 py-1 rounded-md bg-white/[0.06]">
              <span className="text-[9px] font-bold text-white/40 tracking-[0.12em]">FINAL</span>
            </div>
          )}
        </div>

        {/* Right badges */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
          {isLive && viewers > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm">
              <Eye className="w-2.5 h-2.5 text-white/30" />
              <span className="text-[9px] font-mono-premium text-white/40 tabular-nums">{viewers.toLocaleString()}</span>
            </div>
          )}
          {hasLink && !isLive && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-success/10 border border-success/20">
              <Zap className="w-2.5 h-2.5 text-success" />
            </div>
          )}
        </div>

        {/* Favorite */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className={cn(
            "absolute z-10 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 bottom-2.5 right-2.5",
            isFavorite
              ? "bg-warning/15 text-warning border border-warning/25"
              : "bg-black/40 text-white/15 border border-white/[0.04] opacity-0 group-hover/card:opacity-100 hover:text-white/50",
          )}
        >
          <Star className={cn("w-3 h-3", isFavorite && "fill-current")} />
        </button>

        {/* Teams + Score/League center */}
        <div className="absolute inset-0 flex items-center justify-center gap-4 sm:gap-8 px-6">
          <div className="flex-shrink-0 transition-transform duration-300 group-hover/card:scale-105">
            <TeamLogo team={away?.team} leagueKey={leagueInfo.key} />
          </div>

          <div className="flex flex-col items-center gap-1">
            {showScore ? (
              <div className="flex items-center gap-2.5">
                <span className="font-display text-3xl sm:text-4xl text-white tracking-wider">{awayScore}</span>
                <span className="text-xs text-white/10 font-bold">:</span>
                <span className="font-display text-3xl sm:text-4xl text-white tracking-wider">{homeScore}</span>
              </div>
            ) : (
              <span className="text-xs text-white/10 font-display tracking-[0.3em]">VS</span>
            )}
            {isLive && timeText && (
              <span className="text-[9px] font-mono-premium text-primary/60 font-medium">{timeText}</span>
            )}
          </div>

          <div className="flex-shrink-0 transition-transform duration-300 group-hover/card:scale-105">
            <TeamLogo team={home?.team} leagueKey={leagueInfo.key} />
          </div>
        </div>

        {/* Play overlay on hover */}
        {hasLink && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none z-20">
            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Info footer */}
      <div className="px-3 py-2.5 bg-[#0a0a0a]">
        <h3 className="text-[12px] font-semibold text-foreground/80 leading-tight line-clamp-1">
          {away?.team?.shortDisplayName || away?.team?.displayName || "TBD"}
          <span className="text-muted-foreground/25 font-normal mx-1">vs</span>
          {home?.team?.shortDisplayName || home?.team?.displayName || "TBD"}
        </h3>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[9px] font-medium text-muted-foreground/40 truncate">{leagueInfo.name}</span>
          {(isPre || isFinal) && timeText && (
            <>
              <span className="text-[8px] text-muted-foreground/15">·</span>
              <span className="text-[9px] font-mono-premium text-muted-foreground/30 tabular-nums">{timeText}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
