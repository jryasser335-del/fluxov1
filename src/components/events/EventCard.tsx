import { useState, useMemo } from "react";
import { Heart, Radio } from "lucide-react";
import { ESPNEvent } from "@/lib/api";
import { cn } from "@/lib/utils";
import { EventCountdown } from "./EventCountdown";

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

  // Primary: direct logo from ESPN API
  if (team.logo) candidates.push(team.logo);

  // Fallback: ESPN CDN by team ID
  if (team.id) {
    candidates.push(`https://a.espncdn.com/i/teamlogos/${sport}/500/${team.id}.png`);
    candidates.push(`https://a.espncdn.com/i/teamlogos/${sport}/500-dark/${team.id}.png`);
    // Generic combiner fallback
    candidates.push(`https://a.espncdn.com/combiner/i?img=/i/teamlogos/${sport}/500/${team.id}.png&h=100&w=100`);
  }

  return candidates;
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
};

function getLeagueLogoCandidates(leagueInfo: EventCardProps["leagueInfo"]): string[] {
  return [leagueInfo.logo, LEAGUE_LOGO_MAP[leagueInfo.key]].filter(Boolean) as string[];
}

function TeamLogo({ team, color, leagueKey, size = "lg" }: { team: TeamData | undefined; color: string; leagueKey: string; size?: "sm" | "lg" }) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const logos = useMemo(() => getTeamLogoCandidates(team, leagueKey), [team, leagueKey]);
  const logoUrl = logos[candidateIndex];
  const abbr = (team?.abbreviation || team?.shortDisplayName || "?").slice(0, 3);

  const sizeClasses = size === "lg" ? "w-16 h-16 sm:w-20 sm:h-20" : "w-12 h-12";
  const textSize = size === "lg" ? "text-xl sm:text-2xl" : "text-lg";
  const fallbackSize = size === "lg" ? "w-16 h-16 sm:w-20 sm:h-20" : "w-12 h-12";

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
    <div
      className={cn(
        "group relative rounded-xl overflow-hidden transition-all duration-300",
        isLive
          ? "ring-1 ring-primary/30 shadow-[0_0_25px_-5px] shadow-primary/20"
          : "ring-1 ring-white/[0.06] hover:ring-white/[0.15]",
        hasLink ? "cursor-pointer hover:scale-[1.02] hover:shadow-xl" : "opacity-80"
      )}
      onClick={hasLink ? onClick : undefined}
    >
      {/* Split gradient background like ppv.cx */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 opacity-60 group-hover:opacity-80 transition-opacity duration-500"
          style={{
            background: `linear-gradient(to right, ${awayColor}90 0%, ${awayColor}40 35%, #0a0a0a 50%, ${homeColor}40 65%, ${homeColor}90 100%)`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/90" />
      </div>

      {/* Live indicator top bar */}
      {isLive && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-accent to-primary" />
      )}

      {/* Countdown for pre-match events */}
      {isPre && hasLink && (
        <div className="absolute top-2.5 right-2.5 z-10">
          <EventCountdown targetDate={comp?.date || event.date} compact />
        </div>
      )}

      {/* Favorite */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        className={cn(
          "absolute top-2.5 left-2.5 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all",
          isFavorite
            ? "bg-red-500/20 text-red-400"
            : "bg-black/40 text-white/20 opacity-0 group-hover:opacity-100"
        )}
      >
        <Heart className={cn("w-3.5 h-3.5", isFavorite && "fill-current")} />
      </button>

      <div className="relative flex flex-col p-4 pb-3 min-h-[200px] sm:min-h-[220px]">
        {/* Team logos section - ppv.cx style: large logos face to face */}
        <div className="flex items-center justify-center gap-1 flex-1 py-3">
          {/* Away team */}
          <div className="flex-1 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
            <TeamLogo team={away?.team} color={awayColor} leagueKey={leagueInfo.key} />
          </div>

          {/* Center: League logo */}
          <div className="flex flex-col items-center gap-1.5 px-2 min-w-[50px]">
            {leagueLogoUrl && (
              <img
                src={leagueLogoUrl}
                alt={leagueInfo.name}
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain opacity-80 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                onError={() => setLeagueLogoIndex((prev) => prev + 1)}
              />
            )}
            {isLive ? (
              <div className="flex items-center gap-2">
                <span className="font-display text-3xl sm:text-4xl text-white drop-shadow-lg">{away?.score ?? "0"}</span>
                <span className="text-white/30 text-sm font-bold">-</span>
                <span className="font-display text-3xl sm:text-4xl text-white drop-shadow-lg">{home?.score ?? "0"}</span>
              </div>
            ) : isFinal ? (
              <div className="flex items-center gap-2">
                <span className="font-display text-2xl text-white/60">{away?.score ?? "0"}</span>
                <span className="text-white/20 text-xs">-</span>
                <span className="font-display text-2xl text-white/60">{home?.score ?? "0"}</span>
              </div>
            ) : !leagueLogoUrl ? (
              <span className="text-xs font-bold text-white/20 tracking-widest">VS</span>
            ) : null}
          </div>

          {/* Home team */}
          <div className="flex-1 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
            <TeamLogo team={home?.team} color={homeColor} leagueKey={leagueInfo.key} />
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-auto pt-2 border-t border-white/[0.06]">
          <h3 className="text-[13px] sm:text-sm font-bold text-white leading-tight truncate mb-1">
            {away?.team?.displayName || "TBD"} vs. {home?.team?.displayName || "TBD"}
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
               <span className={cn(
                 "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                 isLive ? "bg-primary/25 text-primary" : "bg-primary/15 text-primary"
               )}>
                 {leagueInfo.sub || leagueInfo.name}
               </span>
               {isLive && (
                 <div className="flex items-center gap-1">
                   <Radio className="w-2.5 h-2.5 text-primary animate-pulse" />
                   <span className="text-[8px] font-bold text-primary uppercase">LIVE</span>
                 </div>
               )}
            </div>
            <span className="text-[10px] text-white/30 font-medium">
              {isPre ? clockTxt : isFinal ? clockTxt : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}