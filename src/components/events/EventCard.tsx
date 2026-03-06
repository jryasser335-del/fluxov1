import { useState, useMemo, useEffect } from "react";
import { Heart, Eye } from "lucide-react";
import { ESPNEvent } from "@/lib/api";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useViewerCount } from "@/hooks/useViewerCount";
import { motion } from "framer-motion";

interface EventCardProps {
  event: ESPNEvent;
  leagueInfo: { key: string; name: string; sub: string; logo?: string };
  hasLink: boolean;
  isFavorite: boolean;
  isFeatured?: boolean;
  streamUrl?: string;
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

  const sizeClasses = size === "lg" ? "w-14 h-14 sm:w-16 sm:h-16" : "w-10 h-10";
  const textSize = size === "lg" ? "text-lg sm:text-xl" : "text-base";
  const fallbackSize = size === "lg" ? "w-14 h-14 sm:w-16 sm:h-16" : "w-10 h-10";

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
    return () => { cancelled = true; };
  }, [logoUrl, searchedLogo, searchTried, team?.displayName, team?.shortDisplayName]);

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={team?.displayName || ""}
        className={cn(sizeClasses, "object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]")}
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
  streamUrl,
  onToggleFavorite,
  onClick,
  formatTime,
}: EventCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const viewerKey = streamUrl ? btoa(streamUrl).slice(0, 32) : null;
  const viewerCount = useViewerCount(viewerKey);
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

  // Format short time for the pill
  const shortTime = useMemo(() => {
    try {
      const d = new Date(comp?.date || event.date);
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    } catch { return ""; }
  }, [comp?.date, event.date]);

  const displayViewers = viewerCount;

  // Sport label for footer
  const sportLabel = useMemo(() => {
    const key = leagueInfo.key;
    if (["nba", "wnba", "ncaab"].includes(key)) return "Basketball";
    if (key.startsWith("mlb") || key.includes("baseball")) return "Baseball";
    if (key === "nhl") return "Hockey";
    if (key === "ufc" || key === "boxing") return "Boxing";
    if (key === "wwe") return "Wrestling";
    return "Football";
  }, [leagueInfo.key]);

  return (
    <div className="flex flex-col gap-2">
      {/* Main card */}
      <motion.div
        className="relative"
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileHover={{ scale: hasLink ? 1.03 : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <div
          className={cn(
            "group relative rounded-xl overflow-hidden transition-all duration-300",
            hasLink ? "cursor-pointer" : "opacity-60"
          )}
          onClick={hasLink ? onClick : undefined}
          style={{ aspectRatio: "16/10" }}
        >
          {/* Background gradient using team colors */}
          <div className="absolute inset-0">
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${awayColor}90 0%, ${awayColor}60 30%, ${homeColor}60 70%, ${homeColor}90 100%)`
              }}
            />
            <div className="absolute inset-0 bg-black/30" />
          </div>

          {/* ═══ TOP BAR ═══ */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2.5 py-2">
            {/* Left: LIVE or Time pill */}
            {isLive ? (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-600 shadow-lg shadow-red-600/40">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                </span>
                <span className="text-[10px] font-black text-white uppercase tracking-wider">LIVE</span>
              </div>
            ) : (
              <div className="px-2.5 py-1 rounded-md bg-emerald-600 shadow-lg shadow-emerald-600/30">
                <span className="text-[10px] font-bold text-white">{shortTime}</span>
              </div>
            )}

            {/* Center: League logo + name */}
            <div className="flex items-center gap-1.5">
              {leagueLogoUrl && (
                <img
                  src={leagueLogoUrl}
                  alt={leagueInfo.name}
                  className="w-4 h-4 object-contain"
                  onError={() => setLeagueLogoIndex((prev) => prev + 1)}
                />
              )}
              <span className="text-[9px] font-bold text-white/80 uppercase tracking-wider hidden sm:inline">
                {leagueInfo.sub}
              </span>
            </div>

            {/* Right: Viewer count pill */}
            {displayViewers > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/40 backdrop-blur-sm">
                <Eye className="w-3 h-3 text-white/70" />
                <span className="text-[10px] font-bold text-white/90">{displayViewers.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* ═══ CENTER: Team logos face-off ═══ */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Away team logo */}
              <div className="relative group-hover:scale-110 transition-transform duration-500">
                <TeamLogo team={away?.team} color={awayColor} leagueKey={leagueInfo.key} />
              </div>

              {/* Center content: score or league logo */}
              <div className="flex flex-col items-center gap-1">
                {leagueLogoUrl && (
                  <img
                    src={leagueLogoUrl}
                    alt={leagueInfo.name}
                    className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                    onError={() => setLeagueLogoIndex((prev) => prev + 1)}
                  />
                )}
                {isLive && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-display text-xl sm:text-2xl text-white font-bold drop-shadow-lg">{away?.score ?? "0"}</span>
                    <span className="text-white/40 text-sm font-light">-</span>
                    <span className="font-display text-xl sm:text-2xl text-white font-bold drop-shadow-lg">{home?.score ?? "0"}</span>
                  </div>
                )}
                {isFinal && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-display text-lg text-white/50">{away?.score ?? "0"}</span>
                    <span className="text-white/20 text-xs">-</span>
                    <span className="font-display text-lg text-white/50">{home?.score ?? "0"}</span>
                  </div>
                )}
                {isPre && !leagueLogoUrl && (
                  <span className="font-display text-sm text-white/20 tracking-[0.3em]">VS</span>
                )}
              </div>

              {/* Home team logo */}
              <div className="relative group-hover:scale-110 transition-transform duration-500">
                <TeamLogo team={home?.team} color={homeColor} leagueKey={leagueInfo.key} />
              </div>
            </div>
          </div>

          {/* Favorite button */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className={cn(
              "absolute bottom-2.5 right-2.5 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300",
              isFavorite
                ? "bg-red-500/30 text-red-400 scale-100"
                : "bg-black/30 text-white/20 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
            )}
          >
            <Heart className={cn("w-3.5 h-3.5", isFavorite && "fill-current")} />
          </button>
        </div>
      </motion.div>

      {/* Footer: Match name + sport/time below card */}
      <div className="px-0.5">
        <h3 className="text-[12px] sm:text-[13px] font-semibold text-white/80 leading-tight truncate">
          {away?.team?.displayName || "TBD"} vs {home?.team?.displayName || "TBD"}
        </h3>
        <p className="text-[10px] sm:text-[11px] text-white/40 mt-0.5 truncate">
          {sportLabel}{isPre || isFinal ? ` | ${clockTxt}` : isLive ? ` | ${clockTxt}` : ""}
        </p>
      </div>
    </div>
  );
}
