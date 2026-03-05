import { Heart, Play, Radio, Tv } from "lucide-react";
import { ESPNEvent } from "@/lib/api";
import { cn } from "@/lib/utils";
import { EventCountdown } from "./EventCountdown";

interface EventCardProps {
  event: ESPNEvent;
  leagueInfo: { name: string; sub: string };
  hasLink: boolean;
  isFavorite: boolean;
  isFeatured?: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
  formatTime: (iso: string) => string;
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
  const awayColor = awayTeam?.color ? `#${awayTeam.color}` : "#6366f1";
  const homeColor = homeTeam?.color ? `#${homeTeam.color}` : "#ec4899";

  // Viewer count indicator (simulated based on link availability)
  const viewerCount = hasLink && isLive ? Math.floor(Math.random() * 50 + 5) : hasLink ? Math.floor(Math.random() * 30 + 1) : 0;

  return (
    <div
      className={cn(
        "group relative rounded-2xl overflow-hidden transition-all duration-300",
        "border backdrop-blur-sm aspect-[16/10]",
        isLive
          ? "border-red-500/30 shadow-[0_0_20px_-8px] shadow-red-500/20"
          : "border-white/[0.08] hover:border-white/15",
        hasLink && "cursor-pointer hover:scale-[1.02]"
      )}
      onClick={hasLink ? onClick : undefined}
    >
      {/* Background with team color gradient - BINTV style */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 opacity-60 transition-opacity duration-500 group-hover:opacity-80"
          style={{
            background: `linear-gradient(135deg, ${awayColor}40 0%, transparent 50%, ${homeColor}40 100%)`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1117]/40 via-[#0d1117]/70 to-[#0d1117]/95" />
      </div>

      {/* Viewer count badge (top right like BINTV) */}
      {hasLink && viewerCount > 0 && (
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/90 shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-[10px] font-bold text-white">{viewerCount}</span>
        </div>
      )}

      {/* Favorite button */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        className={cn(
          "absolute top-2.5 left-2.5 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all",
          isFavorite
            ? "bg-red-500/20 text-red-400"
            : "bg-black/30 text-white/30 opacity-0 group-hover:opacity-100"
        )}
      >
        <Heart className={cn("w-3.5 h-3.5", isFavorite && "fill-current")} />
      </button>

      <div className="relative h-full flex flex-col justify-between">
        {/* Logos area - face to face centered like BINTV */}
        <div className="flex items-center justify-center gap-4 flex-1 px-4 pt-2">
          {/* Away logo */}
          <div className="flex-shrink-0">
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
              style={{
                background: `linear-gradient(145deg, ${awayColor}25, ${awayColor}08)`,
              }}
            >
              {away?.team?.logo ? (
                <img
                  src={away.team.logo}
                  alt={away.team.displayName}
                  className="w-10 h-10 sm:w-14 sm:h-14 object-contain drop-shadow-lg"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <span className="text-2xl">⚽</span>
              )}
            </div>
          </div>

          {/* Center: score or VS */}
          <div className="flex flex-col items-center gap-1">
            {isLive ? (
              <div className="flex items-center gap-2">
                <span className="font-display text-2xl font-bold text-white tabular-nums">
                  {away?.score ?? "0"}
                </span>
                <span className="text-sm text-white/20">-</span>
                <span className="font-display text-2xl font-bold text-white tabular-nums">
                  {home?.score ?? "0"}
                </span>
              </div>
            ) : isFinal ? (
              <div className="flex items-center gap-2">
                <span className="font-display text-xl font-bold text-white/60 tabular-nums">{away?.score ?? "0"}</span>
                <span className="text-xs text-white/20">-</span>
                <span className="font-display text-xl font-bold text-white/60 tabular-nums">{home?.score ?? "0"}</span>
              </div>
            ) : (
              <span className="text-xs font-bold text-white/20">VS</span>
            )}
          </div>

          {/* Home logo */}
          <div className="flex-shrink-0">
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
              style={{
                background: `linear-gradient(145deg, ${homeColor}25, ${homeColor}08)`,
              }}
            >
              {home?.team?.logo ? (
                <img
                  src={home.team.logo}
                  alt={home.team.displayName}
                  className="w-10 h-10 sm:w-14 sm:h-14 object-contain drop-shadow-lg"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <span className="text-2xl">⚽</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer: BINTV style - sport badge + title + subtitle */}
        <div className="px-4 pb-3">
          {/* Sport badge */}
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
              isLive ? "bg-red-500/20 text-red-400" : "bg-primary/20 text-primary"
            )}>
              {leagueInfo.sub || leagueInfo.name}
            </span>
            {isLive && (
              <div className="flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 text-red-400 animate-pulse" />
                <span className="text-[8px] font-bold text-red-400 uppercase">Live</span>
              </div>
            )}
          </div>

          {/* Match title */}
          <h3 className="text-[13px] font-bold text-white leading-tight truncate">
            {away?.team?.displayName || "TBD"} vs. {home?.team?.displayName || "TBD"}
          </h3>

          {/* Subtitle: league or time */}
          <p className="text-[10px] text-white/30 mt-0.5 truncate">
            {isPre ? clockTxt : isFinal ? clockTxt : leagueInfo.name}
          </p>

          {/* Stream availability indicator */}
          {!hasLink && (
            <div className="flex items-center gap-1 mt-1.5">
              <Tv className="w-3 h-3 text-white/20" />
              <span className="text-[9px] text-white/20">Sin señal</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
