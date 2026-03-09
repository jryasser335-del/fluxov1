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
        <div className="absolute inset-0 blur-xl opacity-40 scale-150">
          <img src={logoUrl} alt="" className="w-full h-full object-contain" loading="lazy" />
        </div>
        <img
          src={logoUrl}
          alt={team?.displayName || ""}
          className="relative w-11 h-11 sm:w-14 sm:h-14 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
          onError={() => setCandidateIndex((prev) => prev + 1)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-display text-foreground/60 text-sm bg-white/[0.06] border border-white/[0.06]">
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

  // Handle click - show message for finished matches
  const handleClick = () => {
    if (isFinal) {
      // Don't call onClick for finished matches, just show the card info
      return;
    }
    onClick();
  };

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

  // Score display for live/final
  const awayScore = away?.score;
  const homeScore = home?.score;
  const showScore = (isLive || isFinal) && awayScore !== undefined && homeScore !== undefined;

  return (
    <div className="rgb-border-wrapper">
      <div
        className={cn(
          "premium-card card-shine cursor-pointer group overflow-hidden",
          isLive && "ring-1 ring-destructive/30"
        )}
        onClick={onClick}
      >
      <div
        className="relative aspect-[16/10] overflow-hidden"
        style={{
          background: `linear-gradient(145deg, ${awayColor}dd 0%, ${awayColor}88 35%, hsl(225, 15%, 6%) 50%, ${homeColor}88 65%, ${homeColor}dd 100%)`
        }}
      >
        {/* Mesh overlay for depth */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,_rgba(255,255,255,0.05)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,_rgba(255,255,255,0.03)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

        {/* Live top bar glow */}
        {isLive && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-destructive to-transparent animate-live-pulse" />
        )}

        {/* LIVE badge */}
        {isLive && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-destructive/90 backdrop-blur-sm shadow-lg shadow-destructive/30">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
              </span>
              <span className="text-[10px] font-bold text-white tracking-[0.15em]">LIVE</span>
            </div>
          </div>
        )}

        {/* Time badge for scheduled */}
        {isPre && (
          <div className="absolute top-3 left-3 z-10">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/[0.08]">
              <span className="text-[10px] font-mono-premium font-medium text-white/80 tracking-wide">{timeText}</span>
            </div>
          </div>
        )}

        {/* Final badge */}
        {isFinal && (
          <div className="absolute top-3 left-3 z-10">
            <div className="px-2.5 py-1 rounded-lg bg-white/[0.08] backdrop-blur-md border border-white/[0.06]">
              <span className="text-[10px] font-bold text-muted-foreground tracking-[0.1em]">FT</span>
            </div>
          </div>
        )}

        {/* Viewers / Signal indicator - top right */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          {isLive && viewers > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-md border border-white/[0.06]">
              <Eye className="w-3 h-3 text-white/50" />
              <span className="text-[10px] font-mono-premium font-medium text-white/70 tabular-nums">{viewers.toLocaleString()}</span>
            </div>
          )}
          {hasLink && !isLive && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-success/10 backdrop-blur-md border border-success/20">
              <Zap className="w-3 h-3 text-success" />
            </div>
          )}
        </div>

        {/* Favorite button */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className={cn(
            "absolute z-10 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300",
            isLive ? "bottom-3 right-3" : "bottom-3 right-3",
            isFavorite
              ? "bg-warning/20 text-warning border border-warning/30"
              : "bg-black/30 backdrop-blur-sm text-white/30 border border-white/[0.06] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-white/70"
          )}
        >
          <Star className={cn("w-3.5 h-3.5", isFavorite && "fill-current")} />
        </button>

        {/* Team logos + center element */}
        <div className="absolute inset-0 flex items-center justify-center gap-5 sm:gap-8 px-6">
          <div className="flex-shrink-0">
            <TeamLogo team={away?.team} leagueKey={leagueInfo.key} />
          </div>

          {/* Center: Score or League logo */}
          <div className="flex flex-col items-center gap-1">
            {showScore ? (
              <div className="flex items-center gap-2">
                <span className="font-display text-2xl sm:text-3xl text-white tracking-wider drop-shadow-lg">{awayScore}</span>
                <span className="text-[10px] text-white/20 font-bold">:</span>
                <span className="font-display text-2xl sm:text-3xl text-white tracking-wider drop-shadow-lg">{homeScore}</span>
              </div>
            ) : leagueLogoUrl && !leagueLogoError ? (
              <img
                src={leagueLogoUrl}
                alt={leagueInfo.name}
                className="w-7 h-7 sm:w-9 sm:h-9 object-contain opacity-60 drop-shadow-lg"
                onError={() => setLeagueLogoError(true)}
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center border border-white/[0.04]">
                <span className="text-[7px] text-muted-foreground font-bold">{leagueInfo.sub?.slice(0, 3) || "VS"}</span>
              </div>
            )}
            {isLive && timeText && (
              <span className="text-[9px] font-mono-premium text-primary/80 font-medium tracking-wide">{timeText}</span>
            )}
          </div>

          <div className="flex-shrink-0">
            <TeamLogo team={home?.team} leagueKey={leagueInfo.key} />
          </div>
        </div>

        {/* League watermark */}
        <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
          <span className="text-[7px] text-white/15 font-display tracking-[0.25em] uppercase">
            {leagueInfo.sub || leagueInfo.name}
          </span>
        </div>
      </div>

      {/* Info footer */}
      <div className="bg-card px-3 pt-2.5 pb-2 space-y-1">
        <h3 className="text-[11px] sm:text-[12px] font-semibold text-foreground/90 leading-tight line-clamp-1 tracking-tight">
          {away?.team?.shortDisplayName || away?.team?.displayName || "TBD"}
          <span className="text-muted-foreground/50 font-normal mx-1">vs</span>
          {home?.team?.shortDisplayName || home?.team?.displayName || "TBD"}
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-medium text-muted-foreground/60 truncate">
            {leagueInfo.name}
          </span>
          {(isPre || isFinal) && timeText && (
            <>
              <span className="text-[9px] text-muted-foreground/20">·</span>
              <span className="text-[9px] font-mono-premium text-muted-foreground/50 tabular-nums">{timeText}</span>
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}