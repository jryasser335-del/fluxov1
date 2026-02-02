import { Heart, Play, Link2Off, Clock, Trophy, Tv, Star, Flame, Radio } from "lucide-react";
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
  isFeatured = false,
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

  // Get team records if available
  const awayRecord = (away as { records?: { summary?: string }[] })?.records?.[0]?.summary;
  const homeRecord = (home as { records?: { summary?: string }[] })?.records?.[0]?.summary;

  // Get venue info
  const venue = (comp as { venue?: { fullName?: string } })?.venue?.fullName;

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

  // Determine if this is a premium/featured match (e.g., high-profile teams or playoffs)
  const showFeaturedBadge = isFeatured || isLive;

  return (
    <div
      className={cn(
        "group relative rounded-2xl overflow-hidden transition-all duration-500",
        "border",
        isLive ? "border-destructive/40 shadow-lg shadow-destructive/20" : "border-white/[0.08]",
        showFeaturedBadge && !isLive && "border-primary/30",
        hasLink && "cursor-pointer hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10"
      )}
      onClick={hasLink ? onClick : undefined}
    >
      {/* Animated border glow for live events */}
      {isLive && (
        <div className="absolute inset-0 rounded-2xl animate-pulse">
          <div className="absolute inset-0 rounded-2xl border-2 border-destructive/30" />
        </div>
      )}

      {/* Background gradient with team colors */}
      <div 
        className="absolute inset-0 opacity-50"
        style={{
          background: `linear-gradient(135deg, ${awayColor}25 0%, transparent 40%, transparent 60%, ${homeColor}25 100%)`
        }}
      />
      
      {/* Dark overlay with premium texture */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/75 to-black/90" />
      
      {/* Noise texture overlay for premium feel */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIvPjwvc3ZnPg==')]" />
      
      {/* Animated glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/25 via-transparent to-transparent" />
      </div>

      {/* Top shine */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      
      {/* Side accents */}
      <div className="absolute top-0 bottom-0 left-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
      <div className="absolute top-0 bottom-0 right-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />

      {/* Content */}
      <div className="relative p-4 sm:p-5">
        {/* Featured badge */}
        {showFeaturedBadge && (
          <div className="absolute -top-0.5 -right-0.5 z-10">
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-bl-lg rounded-tr-xl text-[9px] font-bold uppercase tracking-wider",
              isLive ? "bg-destructive text-white" : "bg-gradient-to-r from-yellow-500 to-orange-500 text-black"
            )}>
              {isLive ? (
                <>
                  <Radio className="w-2.5 h-2.5 animate-pulse" />
                  EN VIVO
                </>
              ) : (
                <>
                  <Flame className="w-2.5 h-2.5" />
                  DESTACADO
                </>
              )}
            </div>
          </div>
        )}

        {/* Header: League & Status */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-white/15 to-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 shadow-inner">
              <Trophy className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-bold text-white uppercase tracking-wider truncate">
                {leagueInfo.name}
              </div>
              {venue && (
                <div className="text-[10px] text-white/40 truncate flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-white/30" />
                  {venue}
                </div>
              )}
            </div>
          </div>

          {/* Status badge */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold tracking-wide flex-shrink-0 uppercase shadow-lg",
              isLive && "bg-gradient-to-r from-destructive to-red-600 text-white shadow-destructive/30",
              isFinal && "bg-white/10 text-white/70 border border-white/10",
              isPre && "bg-gradient-to-r from-primary/30 to-purple-500/30 text-primary border border-primary/30"
            )}
          >
            {isLive && (
              <span className="relative flex h-2 w-2">
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
              className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center mb-2 overflow-hidden transition-all duration-500 group-hover:scale-110 group-hover:rotate-[-2deg]"
              style={{
                background: `linear-gradient(145deg, ${awayColor}35, ${awayColor}15)`,
                borderColor: `${awayColor}50`,
                borderWidth: '2px',
                boxShadow: `0 8px 32px ${awayColor}30, inset 0 1px 0 rgba(255,255,255,0.1)`
              }}
            >
              {/* Inner glow */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              {away?.team?.logo ? (
                <img
                  src={away.team.logo}
                  alt={away.team.displayName}
                  className="relative w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-2xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span className="relative text-3xl sm:text-4xl">🏀</span>
              )}
            </div>
            <div className="font-bold text-sm sm:text-base text-white truncate max-w-full">
              {away?.team?.abbreviation || "TBD"}
            </div>
            <div className="text-[10px] sm:text-xs text-white/50 truncate max-w-full">
              {away?.team?.shortDisplayName || "Team"}
            </div>
            {awayRecord && (
              <div className="text-[9px] sm:text-[10px] text-white/30 font-medium mt-0.5">
                {awayRecord}
              </div>
            )}
          </div>

          {/* Score center */}
          <div className="flex flex-col items-center px-2 sm:px-4 flex-shrink-0">
            <div className="relative">
              {/* Score glow effect */}
              {isLive && (
                <div className="absolute inset-0 blur-xl bg-gradient-to-r from-primary/30 via-transparent to-primary/30 animate-pulse" />
              )}
              <div className="relative flex items-center gap-2 sm:gap-4 font-display text-4xl sm:text-5xl tracking-wide">
                <span className={cn(
                  "transition-all duration-300 tabular-nums",
                  isLive ? "text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" : "text-white/50"
                )}>
                  {away?.score ?? "-"}
                </span>
                <div className="flex flex-col items-center">
                  <span className="text-white/15 text-xl sm:text-2xl">VS</span>
                </div>
                <span className={cn(
                  "transition-all duration-300 tabular-nums",
                  isLive ? "text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" : "text-white/50"
                )}>
                  {home?.score ?? "-"}
                </span>
              </div>
            </div>
            
            {/* Clock or countdown */}
            <div className="mt-2">
              {isPre ? (
                <EventCountdown targetDate={comp?.date || event.date} />
              ) : (
                <div className={cn(
                  "text-[10px] sm:text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm",
                  isLive && "bg-destructive/30 text-red-200 border border-destructive/30",
                  isFinal && "bg-white/5 text-white/40 border border-white/5",
                  isPre && "bg-primary/20 text-primary border border-primary/20"
                )}>
                  {clockTxt}
                </div>
              )}
            </div>
          </div>

          {/* Home team */}
          <div className="flex-1 flex flex-col items-center text-center min-w-0">
            <div 
              className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center mb-2 overflow-hidden transition-all duration-500 group-hover:scale-110 group-hover:rotate-[2deg]"
              style={{
                background: `linear-gradient(145deg, ${homeColor}35, ${homeColor}15)`,
                borderColor: `${homeColor}50`,
                borderWidth: '2px',
                boxShadow: `0 8px 32px ${homeColor}30, inset 0 1px 0 rgba(255,255,255,0.1)`
              }}
            >
              {/* Inner glow */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              {home?.team?.logo ? (
                <img
                  src={home.team.logo}
                  alt={home.team.displayName}
                  className="relative w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-2xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span className="relative text-3xl sm:text-4xl">🏀</span>
              )}
            </div>
            <div className="font-bold text-sm sm:text-base text-white truncate max-w-full">
              {home?.team?.abbreviation || "TBD"}
            </div>
            <div className="text-[10px] sm:text-xs text-white/50 truncate max-w-full">
              {home?.team?.shortDisplayName || "Team"}
            </div>
            {homeRecord && (
              <div className="text-[9px] sm:text-[10px] text-white/30 font-medium mt-0.5">
                {homeRecord}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions - Premium design */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/[0.08]">
          {/* Broadcast info with premium styling */}
          <div className="flex items-center gap-2 min-w-0 flex-shrink">
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-lg",
              hasLink ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-white/5 border border-white/5"
            )}>
              {hasLink ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <Tv className="w-3 h-3 text-emerald-400" />
                </>
              ) : (
                <Tv className="w-3 h-3 text-white/30" />
              )}
            </div>
            <span className={cn(
              "text-[10px] sm:text-xs font-medium truncate",
              hasLink ? "text-emerald-400" : "text-white/30"
            )}>
              {hasLink ? "Señal disponible" : "Sin señal"}
            </span>
          </div>

          {/* Action buttons - Premium styling */}
          <div className="flex gap-2 flex-shrink-0">
            {/* Favorite button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className={cn(
                "h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center transition-all duration-300",
                "border backdrop-blur-sm",
                isFavorite
                  ? "bg-gradient-to-br from-red-500/30 to-pink-500/30 border-red-500/40 text-red-400 shadow-lg shadow-red-500/20"
                  : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/20 hover:bg-white/10"
              )}
            >
              <Heart
                className={cn("w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform", isFavorite && "fill-current scale-110")}
              />
            </button>

            {/* Watch button - Premium CTA */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hasLink) onClick();
              }}
              className={cn(
                "h-9 sm:h-10 px-4 sm:px-5 rounded-xl flex items-center gap-2 text-xs sm:text-sm font-bold transition-all duration-300",
                "border",
                hasLink
                  ? "bg-gradient-to-r from-primary via-purple-500 to-primary text-white border-primary/50 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
                  : "bg-white/5 border-white/10 text-white/30 cursor-not-allowed"
              )}
            >
              {hasLink ? (
                <>
                  <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                  <span>VER</span>
                  <Star className="w-3 h-3 text-yellow-300 fill-yellow-300 hidden sm:block" />
                </>
              ) : (
                <>
                  <Link2Off className="w-3.5 h-3.5" />
                  <span>N/A</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
