import { useState, useMemo, useEffect } from "react";
import { Heart, Radio } from "lucide-react";
import { ESPNEvent } from "@/lib/api";
import { cn } from "@/lib/utils";
import { EventCountdown } from "./EventCountdown";
import { motion } from "framer-motion";

interface EventCardProps {
  event: ESPNEvent;
  leagueInfo: { key: string; name: string; sub: string; logo?: string };
  hasLink: boolean;
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

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "tizmocegplamrmpfxvdu";
  const queries = Array.from(new Set([
    teamName,
    teamName.replace(/\b(Baseball|Basketball|Football|Hockey|Rugby)\b/gi, "").trim(),
    teamName.replace(/\b(Fc|CF|SC|SK|AC|Club)\b/gi, "").trim(),
  ].filter(Boolean)));

  for (const q of queries) {
    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/team-logo-search?t=${encodeURIComponent(q)}`);
      if (!res.ok) continue;
      const data = await res.json();
      const logo = data?.logo || null;
      if (logo) {
        teamSearchCache.set(key, logo);
        return logo;
      }
    } catch {
      // continue
    }
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
  "esp.copa_del_rey": "https://a.espncdn.com/i/leaguelogos/soccer/500/66.png",
  "eng.fa": "https://a.espncdn.com/i/leaguelogos/soccer/500/39.png",
  "eng.league_cup": "https://a.espncdn.com/i/leaguelogos/soccer/500/37.png",
  "ger.dfb_pokal": "https://a.espncdn.com/i/leaguelogos/soccer/500/529.png",
  "ita.coppa_italia": "https://a.espncdn.com/i/leaguelogos/soccer/500/535.png",
  "fra.coupe_de_france": "https://a.espncdn.com/i/leaguelogos/soccer/500/182.png",
  nba: "https://a.espncdn.com/i/teamlogos/leagues/500/nba.png",
  wnba: "https://a.espncdn.com/i/teamlogos/leagues/500/wnba.png",
  mlb: "https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png",
  nhl: "https://a.espncdn.com/i/teamlogos/leagues/500/nhl.png",
  ufc: "https://a.espncdn.com/i/teamlogos/leagues/500/ufc.png",
  // Additional leagues
  "ger.2": "https://a.espncdn.com/i/leaguelogos/soccer/500/10.png",
  "eng.2": "https://a.espncdn.com/i/leaguelogos/soccer/500/24.png",
  "esp.2": "https://a.espncdn.com/i/leaguelogos/soccer/500/15.png",
  "fra.2": "https://a.espncdn.com/i/leaguelogos/soccer/500/9.png",
  "ita.2": "https://a.espncdn.com/i/leaguelogos/soccer/500/12.png",
  "ned.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/11.png",
  "por.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/14.png",
  "arg.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/1.png",
  "bra.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/85.png",
  "mex.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/22.png",
  mls: "https://a.espncdn.com/i/leaguelogos/soccer/500/19.png",
};

function getLeagueLogoCandidates(leagueInfo: EventCardProps["leagueInfo"]): string[] {
  return [leagueInfo.logo, LEAGUE_LOGO_MAP[leagueInfo.key]].filter(Boolean) as string[];
}

function TeamLogo({ team, color, leagueKey, size = "lg" }: { team: TeamData | undefined; color: string; leagueKey: string; size?: "sm" | "lg" }) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [searchedLogo, setSearchedLogo] = useState<string | null>(null);
  const [searchTried, setSearchTried] = useState(false);
  const baseLogos = useMemo(() => getTeamLogoCandidates(team, leagueKey), [team, leagueKey]);
  const logos = useMemo(() => (searchedLogo ? [...baseLogos, searchedLogo] : baseLogos), [baseLogos, searchedLogo]);
  const logoUrl = logos[candidateIndex];
  const abbr = (team?.abbreviation || team?.shortDisplayName || "?").slice(0, 3);

  const sizeClasses = size === "lg" ? "w-16 h-16 sm:w-20 sm:h-20" : "w-12 h-12";
  const textSize = size === "lg" ? "text-xl sm:text-2xl" : "text-lg";
  const fallbackSize = size === "lg" ? "w-16 h-16 sm:w-20 sm:h-20" : "w-12 h-12";

  useEffect(() => {
    let cancelled = false;
    if (searchTried || searchedLogo) return;
    if (logoUrl) return;
    const name = team?.displayName || team?.shortDisplayName;
    if (!name) return;

    setSearchTried(true);
    searchTeamLogoFromESPN(name).then((url) => {
      if (!cancelled && url) setSearchedLogo(url);
    });

    return () => {
      cancelled = true;
    };
  }, [logoUrl, searchedLogo, searchTried, team?.displayName, team?.shortDisplayName]);

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={team?.displayName || ""}
        className={cn(sizeClasses, "object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]")}
        onError={() => setCandidateIndex((prev) => prev + 1)}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={cn(fallbackSize, "rounded-full flex items-center justify-center font-display text-white/90 border-2 border-white/15", textSize)}
      style={{ background: `linear-gradient(135deg, ${color}80, ${color}40)` }}
    >
      {abbr}
    </div>
  );
}

export function EventCard({
  event,
  leagueInfo,
  hasLink,
  isFavorite,
  onToggleFavorite,
  onClick,
  formatTime,
}: EventCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const comp = event.competitions?.[0];
  const status = comp?.status?.type;
  const isLive = status?.state === "in";
  const isFinal = status?.state === "post";
  const isPre = status?.state === "pre";
  const competitors = comp?.competitors || [];
  const away = competitors.find((c) => c.homeAway === "away") || competitors[0];
  const home = competitors.find((c) => c.homeAway === "home") || competitors[1];

  let clockTxt = "";
  if (isLive) {
    const period = comp?.status?.period ? `Q${comp.status.period}` : "";
    const clock = comp?.status?.displayClock || "";
    clockTxt = [period, clock].filter(Boolean).join(" · ");
  } else if (isFinal) {
    clockTxt = status?.shortDetail || "Final";
  } else {
    clockTxt = formatTime(comp?.date || event.date);
  }

  const awayColor = away?.team?.color ? `#${away.team.color}` : "#1e3a5f";
  const homeColor = home?.team?.color ? `#${home.team.color}` : "#5f1e1e";

  const leagueLogos = useMemo(() => getLeagueLogoCandidates(leagueInfo), [leagueInfo]);
  const [leagueLogoIndex, setLeagueLogoIndex] = useState(0);
  const leagueLogoUrl = leagueLogos[leagueLogoIndex];

  return (
    <motion.div
      className="relative"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: hasLink ? 1.03 : 1, y: hasLink ? -4 : 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Ambient glow behind card */}
      <motion.div
        className="absolute -inset-3 rounded-3xl blur-2xl -z-10"
        animate={{
          opacity: isHovered ? 0.4 : 0,
        }}
        transition={{ duration: 0.5 }}
        style={{
          background: `radial-gradient(ellipse at center, ${awayColor}40, ${homeColor}30, transparent 70%)`
        }}
      />

      <div
        className={cn(
          "group relative rounded-2xl overflow-hidden transition-all duration-300",
          isLive
            ? "ring-1 ring-primary/40 shadow-[0_0_30px_-5px] shadow-primary/25"
            : "ring-1 ring-white/[0.06] hover:ring-white/[0.12]",
          hasLink ? "cursor-pointer" : "opacity-70"
        )}
        onClick={hasLink ? onClick : undefined}
      >
        {/* Split gradient background */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 opacity-50 group-hover:opacity-70 transition-opacity duration-700"
            style={{
              background: `linear-gradient(135deg, ${awayColor}60 0%, #08080800 40%, #08080800 60%, ${homeColor}60 100%)`
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/90" />
        </div>

        {/* Live indicator */}
        {isLive && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent animate-gradient-shift" style={{ backgroundSize: '200% 100%' }} />
        )}

        {/* Countdown for pre-match — top right */}
        {isPre && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <EventCountdown targetDate={comp?.date || event.date} compact />
          </div>
        )}

        {/* Favorite */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className={cn(
            "absolute top-3 left-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-sm",
            isFavorite
              ? "bg-destructive/25 text-destructive scale-100"
              : "bg-black/40 text-white/20 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
          )}
        >
          <Heart className={cn("w-3.5 h-3.5", isFavorite && "fill-current")} />
        </button>

        <div className="relative flex flex-col min-h-[200px] sm:min-h-[220px]">
          {/* Team logos section */}
          <div className="flex items-center justify-center gap-1 flex-1 px-4 py-4">
            {/* Away team */}
            <div className="flex-1 flex flex-col items-center gap-1.5 group-hover:scale-110 transition-transform duration-500 ease-out">
              <TeamLogo team={away?.team} color={awayColor} leagueKey={leagueInfo.key} />
              <span className="text-[10px] font-semibold text-white/40 truncate max-w-[80px] text-center leading-tight">
                {away?.team?.abbreviation || away?.team?.shortDisplayName || ""}
              </span>
            </div>

            {/* Center: Score/VS/League */}
            <div className="flex flex-col items-center gap-1.5 px-2 min-w-[55px]">
              {leagueLogoUrl && (
                <img
                  src={leagueLogoUrl}
                  alt={leagueInfo.name}
                  className="w-7 h-7 sm:w-9 sm:h-9 object-contain opacity-70 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]"
                  onError={() => setLeagueLogoIndex((prev) => prev + 1)}
                />
              )}
              {isLive ? (
                <div className="flex items-center gap-2">
                  <span className="font-display text-3xl sm:text-4xl text-white drop-shadow-lg">{away?.score ?? "0"}</span>
                  <span className="text-white/20 text-xs">–</span>
                  <span className="font-display text-3xl sm:text-4xl text-white drop-shadow-lg">{home?.score ?? "0"}</span>
                </div>
              ) : isFinal ? (
                <div className="flex items-center gap-2">
                  <span className="font-display text-2xl text-white/50">{away?.score ?? "0"}</span>
                  <span className="text-white/15 text-xs">–</span>
                  <span className="font-display text-2xl text-white/50">{home?.score ?? "0"}</span>
                </div>
              ) : (
                <span className="font-display text-lg text-white/15 tracking-[0.3em]">VS</span>
              )}
            </div>

            {/* Home team */}
            <div className="flex-1 flex flex-col items-center gap-1.5 group-hover:scale-110 transition-transform duration-500 ease-out">
              <TeamLogo team={home?.team} color={homeColor} leagueKey={leagueInfo.key} />
              <span className="text-[10px] font-semibold text-white/40 truncate max-w-[80px] text-center leading-tight">
                {home?.team?.abbreviation || home?.team?.shortDisplayName || ""}
              </span>
            </div>
          </div>

          {/* Footer info */}
          <div className="mt-auto px-4 pb-3 pt-2 border-t border-white/[0.04]">
            <h3 className="text-[12px] sm:text-[13px] font-semibold text-white/80 leading-tight truncate mb-1.5">
              {away?.team?.displayName || "TBD"} vs {home?.team?.displayName || "TBD"}
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider",
                  isLive ? "bg-primary/20 text-primary" : "bg-white/[0.06] text-white/40"
                )}>
                  {leagueInfo.sub || leagueInfo.name}
                </span>
                {isLive && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10">
                    <Radio className="w-2.5 h-2.5 text-primary animate-pulse" />
                    <span className="text-[8px] font-bold text-primary uppercase tracking-wider">LIVE</span>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-white/25 font-medium font-mono">
                {isPre ? clockTxt : isFinal ? clockTxt : ""}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
