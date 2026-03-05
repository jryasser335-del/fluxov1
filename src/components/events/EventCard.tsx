import { useState } from "react";
import { Heart, Radio } from "lucide-react";
import { ESPNEvent } from "@/lib/api";
import { cn } from "@/lib/utils";

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
  if (["nba", "wnba", "ncaab"].includes(leagueKey)) return "basketball";
  if (leagueKey.startsWith("mlb")) return "baseball";
  if (leagueKey === "nhl") return "hockey";
  if (leagueKey === "ufc" || leagueKey === "boxing" || leagueKey === "wwe") return "mma";
  return "soccer";
}

function getTeamLogoCandidates(team: TeamData | undefined, leagueKey: string): string[] {
  if (!team) return [];
  const sport = getSportSegment(leagueKey);
  const candidates = [team.logo];

  if (team.id) {
    candidates.push(`https://a.espncdn.com/i/teamlogos/${sport}/500/${team.id}.png`);
    candidates.push(`https://a.espncdn.com/i/teamlogos/${sport}/500-dark/${team.id}.png`);
  }

  return candidates.filter(Boolean) as string[];
}

function getLeagueLogoCandidates(leagueInfo: EventCardProps["leagueInfo"]): string[] {
  const fallbackByKey: Record<string, string> = {
    "eng.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/23.png",
    "esp.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/15.png",
    "ger.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/10.png",
    "ita.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/12.png",
    "fra.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/9.png",
    "uefa.champions": "https://a.espncdn.com/i/leaguelogos/soccer/500/2.png",
    "uefa.europa": "https://a.espncdn.com/i/leaguelogos/soccer/500/2310.png",
  };

  return [leagueInfo.logo, fallbackByKey[leagueInfo.key]].filter(Boolean) as string[];
}

function TeamLogo({ team, color, leagueKey }: { team: TeamData | undefined; color: string; leagueKey: string }) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const logos = getTeamLogoCandidates(team, leagueKey);
  const logoUrl = logos[candidateIndex];
  const abbr = (team?.abbreviation || team?.shortDisplayName || "?").slice(0, 3);

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={team?.displayName || ""}
        className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
        onError={() => setCandidateIndex((prev) => prev + 1)}
      />
    );
  }

  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center font-display text-lg text-white/90 border border-white/10"
      style={{ background: `${color}50` }}
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

  const awayTeam = away?.team as { color?: string; alternateColor?: string } | undefined;
  const homeTeam = home?.team as { color?: string; alternateColor?: string } | undefined;
  const awayColor = awayTeam?.color ? `#${awayTeam.color}` : "#3b82f6";
  const homeColor = homeTeam?.color ? `#${homeTeam.color}` : "#ef4444";

  const viewerCount = hasLink && isLive ? Math.floor(Math.random() * 50 + 10) : hasLink ? Math.floor(Math.random() * 30 + 1) : 0;
  const leagueLogos = getLeagueLogoCandidates(leagueInfo);
  const [leagueLogoIndex, setLeagueLogoIndex] = useState(0);
  const leagueLogoUrl = leagueLogos[leagueLogoIndex];

  return (
    <div
      className={cn(
        "group relative rounded-xl overflow-hidden transition-all duration-300",
        isLive
          ? "ring-1 ring-red-500/40 shadow-[0_0_15px_-5px] shadow-red-500/30"
          : "ring-1 ring-white/[0.06] hover:ring-white/[0.12]",
        hasLink && "cursor-pointer hover:scale-[1.02]"
      )}
      onClick={hasLink ? onClick : undefined}
    >
      {/* Dark gradient background with subtle team colors */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity duration-500"
          style={{
            background: `linear-gradient(135deg, ${awayColor}35 0%, #0a0a0a 40%, #0a0a0a 60%, ${homeColor}35 100%)`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/85" />
      </div>

      {/* Viewer badge */}
      {hasLink && viewerCount > 0 && (
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/90">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-[10px] font-bold text-white">{viewerCount}</span>
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

      <div className="relative flex flex-col p-4 pb-3 min-h-[180px] sm:min-h-[200px]">
        {/* Team logos with league logo in center */}
        <div className="flex items-center justify-center gap-2 flex-1 py-2">
          {/* Away team logo */}
          <div className="flex-shrink-0 w-14 h-14 sm:w-[68px] sm:h-[68px] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <TeamLogo team={away?.team} color={awayColor} leagueKey={leagueInfo.key} />
          </div>

          {/* Center: League logo + Score/VS */}
          <div className="flex flex-col items-center gap-1 min-w-[55px]">
            {leagueLogoUrl && (
              <img
                src={leagueLogoUrl}
                alt={leagueInfo.name}
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain opacity-70 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                onError={() => setLeagueLogoIndex((prev) => prev + 1)}
              />
            )}
            {isLive ? (
              <div className="flex items-center gap-1.5">
                <span className="font-display text-2xl sm:text-3xl text-white">{away?.score ?? "0"}</span>
                <span className="text-white/20 text-xs">-</span>
                <span className="font-display text-2xl sm:text-3xl text-white">{home?.score ?? "0"}</span>
              </div>
            ) : isFinal ? (
              <div className="flex items-center gap-1.5">
                <span className="font-display text-xl text-white/50">{away?.score ?? "0"}</span>
                <span className="text-white/15 text-xs">-</span>
                <span className="font-display text-xl text-white/50">{home?.score ?? "0"}</span>
              </div>
            ) : !leagueLogoUrl ? (
              <span className="text-[10px] font-bold text-white/15 tracking-widest">VS</span>
            ) : null}
          </div>

          {/* Home team logo */}
          <div className="flex-shrink-0 w-14 h-14 sm:w-[68px] sm:h-[68px] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <TeamLogo team={home?.team} color={homeColor} leagueKey={leagueInfo.key} />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto">
          <div className="flex items-center gap-1.5 mb-1">
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
              isLive ? "bg-red-500/25 text-red-400" : "bg-primary/20 text-primary"
            )}>
              {leagueInfo.sub || leagueInfo.name}
            </span>
            {isLive && (
              <div className="flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 text-red-400 animate-pulse" />
                <span className="text-[8px] font-bold text-red-400 uppercase">LIVE</span>
              </div>
            )}
          </div>

          <h3 className="text-[12px] sm:text-[13px] font-semibold text-white leading-tight truncate">
            {away?.team?.displayName || "TBD"} vs. {home?.team?.displayName || "TBD"}
          </h3>
          <p className="text-[10px] text-white/25 mt-0.5 truncate">
            {isPre ? clockTxt : isFinal ? clockTxt : leagueInfo.name}
          </p>
        </div>
      </div>
    </div>
  );
}
