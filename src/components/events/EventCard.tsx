import { useState, useMemo, useEffect } from "react";
import { Heart, Eye, Star } from "lucide-react";
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
      <img
        src={logoUrl}
        alt={team?.displayName || ""}
        className="w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
        onError={() => setCandidateIndex((prev) => prev + 1)}
        loading="lazy"
      />
    );
  }

  return (
    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-display text-white/60 text-base bg-white/10">
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

  const awayColor = away?.team?.color ? `#${away.team.color}` : "#8b2252";
  const homeColor = home?.team?.color ? `#${home.team.color}` : "#22528b";

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

  return (
    <div
      className={cn(
        "group relative rounded-xl overflow-hidden transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-xl"
      )}
      onClick={onClick}
    >
      {/* Thumbnail area with team-color gradient */}
      <div
        className="relative aspect-[16/10] overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${awayColor} 0%, ${awayColor}cc 30%, ${homeColor}cc 70%, ${homeColor} 100%)`
        }}
      >
        {/* Diagonal split overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, transparent 45%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.15) 55%, transparent 55%)`
          }}
        />
        {/* Dark vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />

        {/* LIVE badge - top left */}
        {isLive && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-display text-white bg-red-600 uppercase tracking-[0.15em] shadow-md">
              LIVE
            </span>
          </div>
        )}

        {/* Time badge for scheduled */}
        {isPre && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono-premium text-white/90 bg-black/50 backdrop-blur-sm tracking-wide">
              {timeText}
            </span>
          </div>
        )}

        {/* Viewers - top right */}
        {isLive && viewers > 0 && (
          <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded bg-black/40 backdrop-blur-sm">
            <span className="text-[10px] font-mono-premium font-medium text-white tabular-nums">{viewers.toLocaleString()}</span>
            <Eye className="w-3 h-3 text-white/70" />
          </div>
        )}

        {/* Favorite - top right (for non-live) */}
        {!isLive && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className={cn(
              "absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all",
              isFavorite
                ? "bg-yellow-500/30 text-yellow-400"
                : "bg-black/30 text-white/40 opacity-0 group-hover:opacity-100"
            )}
          >
            <Star className={cn("w-3.5 h-3.5", isFavorite && "fill-current")} />
          </button>
        )}

        {/* Live favorite button */}
        {isLive && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className={cn(
              "absolute bottom-2.5 right-2.5 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all",
              isFavorite
                ? "bg-yellow-500/30 text-yellow-400"
                : "bg-black/30 text-white/40 opacity-0 group-hover:opacity-100"
            )}
          >
            <Star className={cn("w-3.5 h-3.5", isFavorite && "fill-current")} />
          </button>
        )}

        {/* Team logos + league logo center */}
        <div className="absolute inset-0 flex items-center justify-center gap-4 sm:gap-6 px-4">
          <TeamLogo team={away?.team} leagueKey={leagueInfo.key} />

          {/* League logo center */}
          {leagueLogoUrl && !leagueLogoError ? (
            <img
              src={leagueLogoUrl}
              alt={leagueInfo.name}
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain opacity-80 drop-shadow-lg"
              onError={() => setLeagueLogoError(true)}
            />
          ) : (
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/30 flex items-center justify-center">
              <span className="text-[8px] text-white/50 font-bold">{leagueInfo.sub?.slice(0, 3) || "VS"}</span>
            </div>
          )}

          <TeamLogo team={home?.team} leagueKey={leagueInfo.key} />
        </div>

        {/* Channel watermark bottom-center */}
        <div className="absolute bottom-1.5 left-0 right-0 text-center">
          <span className="text-[8px] text-white/35 font-display tracking-[0.2em] uppercase">
            {leagueInfo.sub || leagueInfo.name}
          </span>
        </div>
      </div>

      {/* Info below card */}
      <div className="bg-background px-1.5 pt-2 pb-1.5 space-y-0.5">
        <h3 className="text-[12px] sm:text-[13px] font-tech font-semibold text-foreground leading-tight line-clamp-2 tracking-tight">
          {away?.team?.displayName || "TBD"} <span className="text-muted-foreground font-normal">vs</span> {home?.team?.displayName || "TBD"}
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-body text-muted-foreground">
            {leagueInfo.name}
          </span>
          {(isPre || isFinal) && (
            <>
              <span className="text-[10px] text-muted-foreground/30">·</span>
              <span className="text-[10px] font-mono-premium text-muted-foreground tabular-nums">{timeText}</span>
            </>
          )}
          {isLive && timeText && (
            <>
              <span className="text-[10px] text-muted-foreground/30">·</span>
              <span className="text-[10px] font-mono-premium text-primary font-medium tabular-nums">{timeText}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
