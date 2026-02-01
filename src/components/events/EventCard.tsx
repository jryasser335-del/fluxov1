import { Heart, Play, Link2Off, Clock, Trophy, Tv } from "lucide-react";
import { ESPNEvent } from "@/lib/api";
import { cn } from "@/lib/utils";

interface EventCardProps {
  event: ESPNEvent;
  leagueInfo: { name: string; sub: string };
  hasLink: boolean;
  isFavorite: boolean;
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

  // Get team colors for gradient (fallback to league colors)
  const awayTeam = away?.team as { color?: string } | undefined;
  const homeTeam = home?.team as { color?: string } | undefined;
  const awayColor = awayTeam?.color ? `#${awayTeam.color}` : "hsl(270 100% 65%)";
  const homeColor = homeTeam?.color ? `#${homeTeam.color}` : "hsl(300 80% 55%)";

  return (
    <div
      className={cn(
        "group relative rounded-2xl overflow-hidden transition-all duration-500",
        "border border-white/[0.06]",
        hasLink && "cursor-pointer hover:scale-[1.02]"
      )}
      onClick={hasLink ? onClick : undefined}
    >
      {/* Background gradient with team colors */}
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          background: `linear-gradient(135deg, ${awayColor}20 0%, transparent 50%, ${homeColor}20 100%)`
        }}
      />
      
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black/95" />
      
      {/* Animated glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent" />
      </div>

      {/* Top shine */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      {/* Content */}
      <div className="relative p-4 sm:p-5">
        {/* Header: League & Status */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-bold text-white/90 uppercase tracking-wider truncate">
                {leagueInfo.name}
              </div>
              {leagueInfo.sub && leagueInfo.sub !== leagueInfo.name && (
                <div className="text-[10px] text-white/50 truncate">{leagueInfo.sub}</div>
              )}
            </div>
          </div>

          {/* Status badge */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold tracking-wide flex-shrink-0 uppercase",
              isLive && "bg-destructive text-white",
              isFinal && "bg-white/10 text-white/70",
              isPre && "bg-primary/20 text-primary border border-primary/30"
            )}
          >
            {isLive && (
              <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-full w-full bg-white" />
              </span>
            )}
            {isPre && <Clock className="w-3 h-3" />}
            {isLive ? "LIVE" : isFinal ? "FINAL" : "PRONTO"}
          </div>
        </div>

        {/* Main matchup section - NBA style */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 mb-4">
          {/* Away team */}
          <div className="flex-1 flex flex-col items-center text-center min-w-0">
            <div 
              className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-2 overflow-hidden transition-transform duration-300 group-hover:scale-110"
              style={{
                background: `linear-gradient(135deg, ${awayColor}30, ${awayColor}10)`,
                borderColor: `${awayColor}40`,
                borderWidth: '1px'
              }}
            >
              {away?.team?.logo ? (
                <img
                  src={away.team.logo}
                  alt={away.team.displayName}
                  className="w-10 h-10 sm:w-14 sm:h-14 object-contain drop-shadow-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span className="text-2xl sm:text-3xl">🏀</span>
              )}
            </div>
            <div className="font-bold text-xs sm:text-sm text-white truncate max-w-full">
              {away?.team?.abbreviation || "TBD"}
            </div>
            <div className="text-[10px] sm:text-xs text-white/50 truncate max-w-full">
              {away?.team?.shortDisplayName || "Team"}
            </div>
          </div>

          {/* Score center */}
          <div className="flex flex-col items-center px-2 sm:px-4 flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 font-display text-3xl sm:text-4xl tracking-wide">
              <span className={cn(
                "transition-colors",
                isLive ? "text-white" : "text-white/50"
              )}>
                {away?.score ?? "-"}
              </span>
              <span className="text-white/20 text-xl sm:text-2xl">:</span>
              <span className={cn(
                "transition-colors",
                isLive ? "text-white" : "text-white/50"
              )}>
                {home?.score ?? "-"}
              </span>
            </div>
            <div className={cn(
              "text-[10px] sm:text-xs font-medium mt-1 px-2 py-0.5 rounded-full",
              isLive && "bg-destructive/20 text-red-300",
              isFinal && "text-white/40",
              isPre && "text-primary"
            )}>
              {clockTxt}
            </div>
          </div>

          {/* Home team */}
          <div className="flex-1 flex flex-col items-center text-center min-w-0">
            <div 
              className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-2 overflow-hidden transition-transform duration-300 group-hover:scale-110"
              style={{
                background: `linear-gradient(135deg, ${homeColor}30, ${homeColor}10)`,
                borderColor: `${homeColor}40`,
                borderWidth: '1px'
              }}
            >
              {home?.team?.logo ? (
                <img
                  src={home.team.logo}
                  alt={home.team.displayName}
                  className="w-10 h-10 sm:w-14 sm:h-14 object-contain drop-shadow-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span className="text-2xl sm:text-3xl">🏀</span>
              )}
            </div>
            <div className="font-bold text-xs sm:text-sm text-white truncate max-w-full">
              {home?.team?.abbreviation || "TBD"}
            </div>
            <div className="text-[10px] sm:text-xs text-white/50 truncate max-w-full">
              {home?.team?.shortDisplayName || "Team"}
            </div>
          </div>
        </div>

        {/* Footer actions - Fixed for mobile */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/[0.06]">
          {/* Broadcast info */}
          <div className="flex items-center gap-1.5 text-white/40 min-w-0 flex-shrink">
            <Tv className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs truncate">
              {hasLink ? "Disponible" : "Sin señal"}
            </span>
          </div>

          {/* Action buttons - Always visible */}
          <div className="flex gap-2 flex-shrink-0">
            {/* Favorite button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className={cn(
                "h-8 w-8 sm:h-9 sm:w-9 rounded-xl flex items-center justify-center transition-all duration-200",
                "border",
                isFavorite
                  ? "bg-destructive/20 border-destructive/40 text-red-400"
                  : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/20"
              )}
            >
              <Heart
                className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isFavorite && "fill-current")}
              />
            </button>

            {/* Watch button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hasLink) onClick();
              }}
              className={cn(
                "h-8 sm:h-9 px-3 sm:px-4 rounded-xl flex items-center gap-1.5 sm:gap-2 text-xs font-semibold transition-all duration-200",
                "border",
                hasLink
                  ? "bg-primary text-white border-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                  : "bg-white/5 border-white/10 text-white/30"
              )}
            >
              {hasLink ? (
                <>
                  <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
                  <span className="hidden xs:inline sm:inline">Ver</span>
                </>
              ) : (
                <>
                  <Link2Off className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden xs:inline sm:inline">N/A</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
