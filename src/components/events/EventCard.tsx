import { useState, useMemo, useEffect } from "react";
import { Eye, Star, Zap } from "lucide-react";
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
  const queries = Array.from(new Set([
    teamName,
    teamName.replace(/\b(Baseball|Basketball|Football|Hockey|Rugby)\b/gi, "").trim(),
    teamName.replace(/\b(Fc|CF|SC|SK|AC|Club)\b/gi, "").trim(),
  ].filter(Boolean)));
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

const LEAGUE_LOGO_MAP: Record<string, string> = {
  "eng.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/23.png",
  "esp.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/15.png",
  "ger.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/10.png",
  "ita.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/12.png",
  "fra.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/9.png",
  "uefa.champions": "https://a.espncdn.com/i/leaguelogos/soccer/500/2.png",
  "uefa.europa": "https://a.espncdn.com/i/leaguelogos/soccer/500/2310.png",
  nba: "https://a.espncdn.com/i/teamlogos/leagues/500/nba.png",
  wnba: "https://a.espncdn.com/i/teamlogos/leagues/500/wnba.png",
  mlb: "https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png",
  nhl: "https://a.espncdn.com/i/teamlogos/leagues/500/nhl.png",
  ufc: "https://a.espncdn.com/i/teamlogos/leagues/500/ufc.png",
  "bra.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/85.png",
  "arg.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/1.png",
  "mex.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/22.png",
  mls: "https://a.espncdn.com/i/leaguelogos/soccer/500/19.png",
};

function TeamLogo({ team, leagueKey }: { team: TeamData | undefined; leagueKey: string }) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [searchedLogo, setSearchedLogo] = useState<string | null>(null);
  const [searchTried, setSearchTried] = useState(false);
  const baseLogos = useMemo(() => getTeamLogoCandidates(team, leagueKey), [team, leagueKey]);
  const logos = useMemo(() => (searchedLogo ? [...baseLogos, searchedLogo] : baseLogos), [baseLogos, searchedLogo]);
  const logoUrl = logos[candidateIndex];
  const abbr = (team?.abbreviation || team?.shortDisplayName || "?").slice(0, 3);

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
        <div className="absolute inset-0 blur-2xl opacity-30 scale-[1.8]">
          <img src={logoUrl} alt="" className="w-full h-full object-contain" loading="lazy" />
        </div>
        <img
          src={logoUrl}
          alt={team?.displayName || ""}
          className="relative w-12 h-12 sm:w-[60px] sm:h-[60px] object-contain drop-shadow-[0_6px_20px_rgba(0,0,0,0.7)]"
          onError={() => setCandidateIndex((prev) => prev + 1)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="w-12 h-12 sm:w-[60px] sm:h-[60px] rounded-2xl flex items-center justify-center font-display text-foreground/50 text-sm bg-white/[0.04] border border-white/[0.05] backdrop-blur-sm">
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

  const awayColor = away?.team?.color ? `#${away.team.color}` : "#1a3a5c";
  const homeColor = home?.team?.color ? `#${home.team.color}` : "#5c1a3a";

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

  const leagueLogoUrl = leagueInfo.logo || LEAGUE_LOGO_MAP[leagueInfo.key];
  const [leagueLogoError, setLeagueLogoError] = useState(false);

  const viewers = useMemo(() => isLive ? Math.floor(Math.random() * 15000) + 500 : 0, [isLive]);

  const awayScore = away?.score;
  const homeScore = home?.score;
  const showScore = (isLive || isFinal) && awayScore !== undefined && homeScore !== undefined;

  return (
    <div className="group/card relative">
      {/* Outer glow on hover */}
      <div className={cn(
        "absolute -inset-px rounded-[18px] opacity-0 group-hover/card:opacity-100 transition-opacity duration-500",
        isLive ? "bg-gradient-to-br from-primary/20 via-transparent to-primary-glow/10" : "bg-gradient-to-br from-white/[0.06] via-transparent to-white/[0.03]"
      )} />
      
      <div
        className={cn(
          "relative rounded-[17px] overflow-hidden cursor-pointer transition-all duration-500 touch-manipulation",
          "border border-white/[0.05] hover:border-white/[0.1]",
          "bg-gradient-to-b from-card to-background",
          "hover:-translate-y-1 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)]",
          isLive && "border-primary/15 hover:border-primary/30",
          isFinal && "opacity-60 hover:opacity-80"
        )}
        onClick={onClick}
      >
        {/* Top shine line */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent z-10" />
        
        {/* Match visual area */}
        <div
          className="relative aspect-[16/9] overflow-hidden"
          style={{
            background: `linear-gradient(145deg, ${awayColor}cc 0%, ${awayColor}55 30%, hsl(228, 16%, 4%) 50%, ${homeColor}55 70%, ${homeColor}cc 100%)`
          }}
        >
          {/* Depth layers */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_15%,_rgba(255,255,255,0.06)_0%,_transparent_45%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_85%,_rgba(255,255,255,0.04)_0%,_transparent_45%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

          {/* LIVE badge */}
          {isLive && (
            <div className="absolute top-3 left-3 z-10">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/90 backdrop-blur-md shadow-lg shadow-destructive/30 border border-white/[0.1]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                </span>
                <span className="text-[10px] font-black text-white tracking-[0.2em]">LIVE</span>
              </div>
            </div>
          )}

          {/* Time badge for scheduled */}
          {isPre && (
            <div className="absolute top-3 left-3 z-10">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/50 backdrop-blur-xl border border-white/[0.06]">
                <span className="text-[10px] font-mono-premium font-medium text-white/70 tracking-wide">{timeText}</span>
              </div>
            </div>
          )}

          {/* Final badge */}
          {isFinal && (
            <div className="absolute top-3 left-3 z-10">
              <div className="px-3 py-1.5 rounded-xl bg-white/[0.08] backdrop-blur-xl border border-white/[0.06]">
                <span className="text-[10px] font-bold text-white/60 tracking-[0.12em]">FINAL</span>
              </div>
            </div>
          )}

          {/* Viewers / Signal indicator */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
            {isLive && viewers > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-black/40 backdrop-blur-xl border border-white/[0.05]">
                <Eye className="w-3 h-3 text-white/40" />
                <span className="text-[10px] font-mono-premium font-medium text-white/60 tabular-nums">{viewers.toLocaleString()}</span>
              </div>
            )}
            {hasLink && !isLive && (
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-success/[0.08] backdrop-blur-xl border border-success/15">
                <Zap className="w-3 h-3 text-success/80" />
              </div>
            )}
          </div>

          {/* Favorite button */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className={cn(
              "absolute z-10 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 bottom-3 right-3",
              isFavorite
                ? "bg-warning/15 text-warning border border-warning/25 backdrop-blur-xl"
                : "bg-black/30 backdrop-blur-xl text-white/20 border border-white/[0.05] opacity-100 sm:opacity-0 sm:group-hover/card:opacity-100 hover:text-white/60"
            )}
          >
            <Star className={cn("w-3.5 h-3.5", isFavorite && "fill-current")} />
          </button>

          {/* Team logos + center element */}
          <div className="absolute inset-0 flex items-center justify-center gap-6 sm:gap-10 px-8">
            <div className="flex-shrink-0 transition-transform duration-500 group-hover/card:scale-110">
              <TeamLogo team={away?.team} leagueKey={leagueInfo.key} />
            </div>

            {/* Center: Score or League logo */}
            <div className="flex flex-col items-center gap-1.5">
              {showScore ? (
                <div className="flex items-center gap-3">
                  <span className="font-display text-3xl sm:text-4xl text-white tracking-wider drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">{awayScore}</span>
                  <span className="text-xs text-white/10 font-bold">:</span>
                  <span className="font-display text-3xl sm:text-4xl text-white tracking-wider drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">{homeScore}</span>
                </div>
              ) : leagueLogoUrl && !leagueLogoError ? (
                <img
                  src={leagueLogoUrl}
                  alt={leagueInfo.name}
                  className="w-8 h-8 sm:w-10 sm:h-10 object-contain opacity-50 drop-shadow-lg"
                  onError={() => setLeagueLogoError(true)}
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center border border-white/[0.03]">
                  <span className="text-[7px] text-muted-foreground/40 font-bold tracking-wider">{leagueInfo.sub?.slice(0, 3) || "VS"}</span>
                </div>
              )}
              {isLive && timeText && (
                <span className="text-[9px] font-mono-premium text-primary/70 font-medium tracking-wide">{timeText}</span>
              )}
            </div>

            <div className="flex-shrink-0 transition-transform duration-500 group-hover/card:scale-110">
              <TeamLogo team={home?.team} leagueKey={leagueInfo.key} />
            </div>
          </div>

          {/* League watermark */}
          <div className="absolute bottom-2.5 left-0 right-0 text-center pointer-events-none">
            <span className="text-[7px] text-white/10 font-display tracking-[0.3em] uppercase">
              {leagueInfo.sub || leagueInfo.name}
            </span>
          </div>
        </div>

        {/* Info footer - refined */}
        <div className="relative px-3.5 pt-3 pb-2.5 space-y-1.5">
          {/* Subtle separator */}
          <div className="absolute top-0 inset-x-3 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
          
          <h3 className="text-[12px] font-semibold text-foreground/85 leading-tight line-clamp-1 tracking-tight">
            {away?.team?.shortDisplayName || away?.team?.displayName || "TBD"}
            <span className="text-muted-foreground/30 font-normal mx-1.5">vs</span>
            {home?.team?.shortDisplayName || home?.team?.displayName || "TBD"}
          </h3>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-medium text-muted-foreground/40 truncate">
              {leagueInfo.name}
            </span>
            {(isPre || isFinal) && timeText && (
              <>
                <span className="text-[9px] text-muted-foreground/15">·</span>
                <span className="text-[9px] font-mono-premium text-muted-foreground/35 tabular-nums">{timeText}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
