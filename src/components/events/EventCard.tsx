import { Heart, Play, Link2Off, Clock, Trophy, Tv, Flame, Radio, Sparkles, Zap } from "lucide-react";
import { ESPNEvent } from "@/lib/api";
import { cn } from "@/lib/utils";
import { EventCountdown } from "./EventCountdown";
import { EventShareButton } from "./EventShareButton";

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

  const awayRecord = (away as { records?: { summary?: string }[] })?.records?.[0]?.summary;
  const homeRecord = (home as { records?: { summary?: string }[] })?.records?.[0]?.summary;
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

  const awayTeam = away?.team as { color?: string; alternateColor?: string } | undefined;
  const homeTeam = home?.team as { color?: string; alternateColor?: string } | undefined;
  const awayColor = awayTeam?.color ? `#${awayTeam.color}` : "#8b5cf6";
  const homeColor = homeTeam?.color ? `#${homeTeam.color}` : "#ec4899";
  const awayAltColor = awayTeam?.alternateColor ? `#${awayTeam.alternateColor}` : awayColor;
  const homeAltColor = homeTeam?.alternateColor ? `#${homeTeam.alternateColor}` : homeColor;

  const showFeaturedBadge = isFeatured || isLive;

  return (
    <div
      className={cn(
        "group relative rounded-3xl overflow-hidden transition-all duration-700",
        "border backdrop-blur-xl",
        isLive 
          ? "border-red-500/50 shadow-[0_0_50px_-10px] shadow-red-500/40" 
          : "border-white/[0.08] hover:border-white/20",
        showFeaturedBadge && !isLive && "border-primary/40",
        hasLink && "cursor-pointer hover:scale-[1.02] hover:shadow-[0_20px_60px_-15px] hover:shadow-primary/30"
      )}
      onClick={hasLink ? onClick : undefined}
    >
      {/* Multi-layer animated background */}
      <div className="absolute inset-0">
        {/* Base gradient with team colors */}
        <div 
          className="absolute inset-0 opacity-60 transition-opacity duration-700 group-hover:opacity-80"
          style={{
            background: `
              radial-gradient(ellipse 120% 80% at 0% 0%, ${awayColor}40 0%, transparent 50%),
              radial-gradient(ellipse 120% 80% at 100% 100%, ${homeColor}40 0%, transparent 50%),
              radial-gradient(ellipse 80% 50% at 50% 100%, ${awayAltColor}20 0%, transparent 60%)
            `
          }}
        />
        
        {/* Animated floating orbs */}
        <div 
          className="absolute w-40 h-40 rounded-full blur-3xl opacity-30 animate-pulse"
          style={{ 
            background: `radial-gradient(circle, ${awayColor} 0%, transparent 70%)`,
            top: '-20%',
            left: '-10%',
            animationDuration: '4s'
          }}
        />
        <div 
          className="absolute w-40 h-40 rounded-full blur-3xl opacity-30 animate-pulse"
          style={{ 
            background: `radial-gradient(circle, ${homeColor} 0%, transparent 70%)`,
            bottom: '-20%',
            right: '-10%',
            animationDuration: '5s',
            animationDelay: '1s'
          }}
        />
        
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/80 to-black/90" />
        
        {/* Premium noise texture */}
        <div className="absolute inset-0 opacity-[0.015] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIvPjwvc3ZnPg==')]" />
      </div>

      {/* Animated border glow for live */}
      {isLive && (
        <>
          <div className="absolute inset-0 rounded-3xl border-2 border-red-500/50 animate-pulse" />
          <div className="absolute inset-[-2px] rounded-3xl bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20 blur-sm animate-pulse" />
        </>
      )}

      {/* Top premium shine line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
      
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-tl-3xl" />
      <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-white/5 to-transparent rounded-br-3xl" />

      {/* Content */}
      <div className="relative p-4 sm:p-6">
        {/* Featured/Live badge - Floating design */}
        {showFeaturedBadge && (
          <div className="absolute -top-1 right-4 z-10">
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-b-xl text-[10px] font-black uppercase tracking-widest shadow-2xl",
              isLive 
                ? "bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white shadow-red-500/50" 
                : "bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-black shadow-amber-500/50"
            )}>
              {isLive ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                  </span>
                  EN VIVO
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  DESTACADO
                </>
              )}
            </div>
          </div>
        )}

        {/* Header: League info */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 border border-white/20 flex items-center justify-center shadow-xl backdrop-blur-sm">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
              <Zap className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider truncate">
              {leagueInfo.name}
            </div>
            {venue && (
              <div className="text-[10px] sm:text-xs text-white/40 truncate flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-primary to-accent" />
                {venue}
              </div>
            )}
          </div>
          
          {/* Status chip */}
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold tracking-wide uppercase",
              "border shadow-lg backdrop-blur-sm",
              isLive && "bg-red-500/20 text-red-300 border-red-500/40 shadow-red-500/20",
              isFinal && "bg-white/10 text-white/60 border-white/10",
              isPre && "bg-primary/20 text-primary border-primary/40 shadow-primary/20"
            )}
          >
            {isLive && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400" />
              </span>
            )}
            {isPre && <Clock className="w-3 h-3" />}
            {isLive ? "LIVE" : isFinal ? "FINAL" : "PRÓXIMO"}
          </div>
        </div>

        {/* Main matchup - Ultra premium NBA style */}
        <div className="flex items-center justify-between gap-2 sm:gap-6 mb-5">
          {/* Away team */}
          <div className="flex-1 flex flex-col items-center text-center min-w-0">
            <div className="relative group/team">
              {/* Glow effect behind logo */}
              <div 
                className="absolute inset-0 blur-2xl opacity-50 transition-opacity group-hover/team:opacity-80"
                style={{ background: awayColor }}
              />
              <div 
                className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-3xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-[-3deg]"
                style={{
                  background: `linear-gradient(145deg, ${awayColor}50, ${awayColor}20)`,
                  border: `2px solid ${awayColor}60`,
                  boxShadow: `
                    0 20px 40px -10px ${awayColor}40,
                    inset 0 2px 0 rgba(255,255,255,0.2),
                    inset 0 -2px 0 rgba(0,0,0,0.2)
                  `
                }}
              >
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black/40 via-transparent to-white/10" />
                {away?.team?.logo ? (
                  <img
                    src={away.team.logo}
                    alt={away.team.displayName}
                    className="relative w-14 h-14 sm:w-20 sm:h-20 object-contain drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span className="relative text-4xl sm:text-5xl">🏀</span>
                )}
              </div>
            </div>
            <div className="mt-3 font-display text-lg sm:text-xl font-bold text-white tracking-wide">
              {away?.team?.abbreviation || "TBD"}
            </div>
            <div className="text-[10px] sm:text-xs text-white/50 truncate max-w-full">
              {away?.team?.shortDisplayName || "Team"}
            </div>
            {awayRecord && (
              <div className="mt-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] sm:text-[10px] text-white/40 font-medium">
                {awayRecord}
              </div>
            )}
          </div>

          {/* Score center - Premium design */}
          <div className="flex flex-col items-center px-2 sm:px-6 flex-shrink-0">
            <div className="relative">
              {/* Animated glow behind score */}
              {isLive && (
                <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-primary/40 via-transparent to-accent/40 animate-pulse" />
              )}
              
              <div className="relative flex items-center gap-3 sm:gap-5">
                <span className={cn(
                  "font-display text-5xl sm:text-7xl font-bold tabular-nums transition-all duration-500",
                  isLive 
                    ? "text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]" 
                    : "text-white/40"
                )}>
                  {away?.score ?? "-"}
                </span>
                
                <div className="flex flex-col items-center gap-1">
                  <div className={cn(
                    "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center",
                    isLive 
                      ? "bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/30" 
                      : "bg-white/10"
                  )}>
                    <Zap className={cn(
                      "w-3 h-3 sm:w-4 sm:h-4",
                      isLive ? "text-white" : "text-white/30"
                    )} />
                  </div>
                  <span className="text-[10px] sm:text-xs text-white/20 font-bold">VS</span>
                </div>
                
                <span className={cn(
                  "font-display text-5xl sm:text-7xl font-bold tabular-nums transition-all duration-500",
                  isLive 
                    ? "text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]" 
                    : "text-white/40"
                )}>
                  {home?.score ?? "-"}
                </span>
              </div>
            </div>
            
            {/* Clock or countdown */}
            <div className="mt-3">
              {isPre ? (
                <EventCountdown targetDate={comp?.date || event.date} />
              ) : (
                <div className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm border",
                  isLive && "bg-red-500/20 text-red-200 border-red-500/30 shadow-lg shadow-red-500/10",
                  isFinal && "bg-white/5 text-white/40 border-white/10",
                  isPre && "bg-primary/20 text-primary border-primary/30"
                )}>
                  {clockTxt}
                </div>
              )}
            </div>
          </div>

          {/* Home team */}
          <div className="flex-1 flex flex-col items-center text-center min-w-0">
            <div className="relative group/team">
              <div 
                className="absolute inset-0 blur-2xl opacity-50 transition-opacity group-hover/team:opacity-80"
                style={{ background: homeColor }}
              />
              <div 
                className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-3xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-[3deg]"
                style={{
                  background: `linear-gradient(145deg, ${homeColor}50, ${homeColor}20)`,
                  border: `2px solid ${homeColor}60`,
                  boxShadow: `
                    0 20px 40px -10px ${homeColor}40,
                    inset 0 2px 0 rgba(255,255,255,0.2),
                    inset 0 -2px 0 rgba(0,0,0,0.2)
                  `
                }}
              >
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black/40 via-transparent to-white/10" />
                {home?.team?.logo ? (
                  <img
                    src={home.team.logo}
                    alt={home.team.displayName}
                    className="relative w-14 h-14 sm:w-20 sm:h-20 object-contain drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span className="relative text-4xl sm:text-5xl">🏀</span>
                )}
              </div>
            </div>
            <div className="mt-3 font-display text-lg sm:text-xl font-bold text-white tracking-wide">
              {home?.team?.abbreviation || "TBD"}
            </div>
            <div className="text-[10px] sm:text-xs text-white/50 truncate max-w-full">
              {home?.team?.shortDisplayName || "Team"}
            </div>
            {homeRecord && (
              <div className="mt-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] sm:text-[10px] text-white/40 font-medium">
                {homeRecord}
              </div>
            )}
          </div>
        </div>

        {/* Footer - Premium action bar */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/[0.08]">
          {/* Broadcast status */}
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl backdrop-blur-sm border",
              hasLink 
                ? "bg-emerald-500/10 border-emerald-500/30" 
                : "bg-white/5 border-white/10"
            )}>
              {hasLink ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  <Tv className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] sm:text-xs font-semibold text-emerald-400">
                    Disponible
                  </span>
                </>
              ) : (
                <>
                  <Tv className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-[10px] sm:text-xs font-medium text-white/30">
                    Sin señal
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-shrink-0">
            <EventShareButton 
              eventId={event.id} 
              title={`${away?.team?.displayName || "Equipo"} vs ${home?.team?.displayName || "Equipo"}`}
              eventDate={comp?.date || event.date}
            />

            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300",
                "border backdrop-blur-sm",
                isFavorite
                  ? "bg-gradient-to-br from-red-500/30 to-pink-500/30 border-red-500/50 text-red-400 shadow-lg shadow-red-500/20"
                  : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/30 hover:bg-white/10"
              )}
            >
              <Heart className={cn(
                "w-4 h-4 transition-all",
                isFavorite && "fill-current scale-110"
              )} />
            </button>

            {/* Premium CTA button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hasLink) onClick();
              }}
              className={cn(
                "h-10 px-5 rounded-xl flex items-center gap-2 text-sm font-bold transition-all duration-300",
                "border shadow-lg",
                hasLink
                  ? "bg-gradient-to-r from-primary via-purple-500 to-accent text-white border-primary/50 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 active:scale-95"
                  : "bg-white/5 border-white/10 text-white/30 cursor-not-allowed"
              )}
            >
              {hasLink ? (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>VER</span>
                  <Sparkles className="w-3 h-3 opacity-70" />
                </>
              ) : (
                <>
                  <Link2Off className="w-4 h-4" />
                  <span>N/A</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom shine */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
}
