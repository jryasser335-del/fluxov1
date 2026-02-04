import { Play, Star, Flame, Radio, Calendar, MapPin, Zap, Crown } from "lucide-react";
import { ESPNEvent } from "@/lib/api";
import { cn } from "@/lib/utils";
import { EventCountdown } from "./EventCountdown";

interface FeaturedMatchProps {
  event: ESPNEvent;
  hasLink: boolean;
  onClick: () => void;
}

export function FeaturedMatch({ event, hasLink, onClick }: FeaturedMatchProps) {
  const comp = event.competitions?.[0];
  const status = comp?.status?.type;
  const isLive = status?.state === "in";
  const isFinal = status?.state === "post";
  const isPre = status?.state === "pre";
  const competitors = comp?.competitors || [];
  const away = competitors.find((c) => c.homeAway === "away") || competitors[0];
  const home = competitors.find((c) => c.homeAway === "home") || competitors[1];

  const awayTeam = away?.team as { color?: string; alternateColor?: string } | undefined;
  const homeTeam = home?.team as { color?: string; alternateColor?: string } | undefined;
  const awayColor = awayTeam?.color ? `#${awayTeam.color}` : "#8b5cf6";
  const homeColor = homeTeam?.color ? `#${homeTeam.color}` : "#ec4899";

  const venue = (comp as { venue?: { fullName?: string; address?: { city?: string } } })?.venue;

  let clockTxt = "";
  if (isLive) {
    const period = comp?.status?.period ? `Q${comp.status.period}` : "";
    const clock = comp?.status?.displayClock || "";
    clockTxt = [period, clock].filter(Boolean).join(" · ");
  } else if (isFinal) {
    clockTxt = status?.shortDetail || "Final";
  }

  return (
    <div 
      className={cn(
        "relative w-full rounded-3xl overflow-hidden mb-6 cursor-pointer group",
        "border border-white/10 hover:border-white/20 transition-all duration-500"
      )}
      onClick={hasLink ? onClick : undefined}
    >
      {/* Animated gradient background */}
      <div 
        className="absolute inset-0 animate-gradient-shift"
        style={{
          background: `linear-gradient(135deg, ${awayColor}30 0%, transparent 40%, transparent 60%, ${homeColor}30 100%)`,
        }}
      />
      
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/85 to-black/95" />
      
      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] animate-pulse delay-1000" />
      </div>

      {/* Top shine line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

      {/* Featured badge */}
      <div className="absolute top-3 left-3 z-10">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 backdrop-blur-sm">
          <Crown className="w-3 h-3 text-yellow-400" />
          <span className="text-[10px] font-bold text-yellow-300 uppercase tracking-wider">
            Destacado
          </span>
        </div>
      </div>

      {/* Live badge */}
      {isLive && (
        <div className="absolute top-3 right-3 z-10">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500 shadow-lg shadow-red-500/40 animate-pulse">
            <Radio className="w-3 h-3 text-white" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">En Vivo</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative p-4 sm:p-6 md:p-8">
        {/* Mobile Layout - Horizontal compact */}
        <div className="block md:hidden">
          <div className="flex items-center justify-between gap-2 mb-4 mt-6">
            {/* Away team */}
            <div className="flex-1 flex flex-col items-center">
              <div 
                className="relative w-16 h-16 rounded-2xl flex items-center justify-center mb-2 transition-all duration-300 group-hover:scale-105"
                style={{
                  background: `linear-gradient(145deg, ${awayColor}40, ${awayColor}15)`,
                  boxShadow: `0 10px 30px ${awayColor}30`,
                  border: `1.5px solid ${awayColor}50`
                }}
              >
                {away?.team?.logo ? (
                  <img
                    src={away.team.logo}
                    alt={away.team.displayName}
                    className="w-10 h-10 object-contain drop-shadow-lg"
                  />
                ) : (
                  <span className="text-2xl">🏀</span>
                )}
              </div>
              <span className="font-display text-lg font-bold text-white">
                {away?.team?.abbreviation || "TBD"}
              </span>
              <span className="text-[10px] text-white/50 truncate max-w-[80px] text-center">
                {away?.team?.displayName || "Team"}
              </span>
            </div>

            {/* Score center */}
            <div className="flex flex-col items-center px-3">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "font-display text-4xl font-bold tabular-nums",
                  isLive ? "text-white" : "text-white/50"
                )}>
                  {away?.score ?? "-"}
                </span>
                <div className="flex flex-col items-center">
                  <Zap className={cn(
                    "w-4 h-4 mb-1",
                    isLive ? "text-yellow-400" : "text-white/20"
                  )} />
                  <span className="text-xs text-white/30">VS</span>
                </div>
                <span className={cn(
                  "font-display text-4xl font-bold tabular-nums",
                  isLive ? "text-white" : "text-white/50"
                )}>
                  {home?.score ?? "-"}
                </span>
              </div>
              
              {/* Status badge */}
              <div className="mt-2">
                {isPre ? (
                  <EventCountdown targetDate={comp?.date || event.date} compact />
                ) : (
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-bold",
                    isLive && "bg-red-500/20 text-red-300 border border-red-500/30",
                    isFinal && "bg-white/10 text-white/60"
                  )}>
                    {clockTxt}
                  </span>
                )}
              </div>
            </div>

            {/* Home team */}
            <div className="flex-1 flex flex-col items-center">
              <div 
                className="relative w-16 h-16 rounded-2xl flex items-center justify-center mb-2 transition-all duration-300 group-hover:scale-105"
                style={{
                  background: `linear-gradient(145deg, ${homeColor}40, ${homeColor}15)`,
                  boxShadow: `0 10px 30px ${homeColor}30`,
                  border: `1.5px solid ${homeColor}50`
                }}
              >
                {home?.team?.logo ? (
                  <img
                    src={home.team.logo}
                    alt={home.team.displayName}
                    className="w-10 h-10 object-contain drop-shadow-lg"
                  />
                ) : (
                  <span className="text-2xl">🏀</span>
                )}
              </div>
              <span className="font-display text-lg font-bold text-white">
                {home?.team?.abbreviation || "TBD"}
              </span>
              <span className="text-[10px] text-white/50 truncate max-w-[80px] text-center">
                {home?.team?.displayName || "Team"}
              </span>
            </div>
          </div>

          {/* Mobile footer */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <div className="flex items-center gap-1.5 text-white/40">
              <MapPin className="w-3 h-3" />
              <span className="text-[10px] truncate max-w-[100px]">
                {venue?.fullName || "Arena"}
              </span>
            </div>
            
            {hasLink && (
              <button
                onClick={(e) => { e.stopPropagation(); onClick(); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-primary/30 hover:scale-105 transition-transform"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Ver
              </button>
            )}
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:block">
          <div className="flex items-center justify-between gap-8 mb-6 mt-4">
            {/* Away team */}
            <div className="flex-1 flex flex-col items-center text-center">
              <div 
                className="relative w-32 h-32 lg:w-36 lg:h-36 rounded-3xl flex items-center justify-center mb-4 transition-all duration-500 group-hover:scale-110 group-hover:rotate-[-3deg]"
                style={{
                  background: `linear-gradient(145deg, ${awayColor}45, ${awayColor}15)`,
                  boxShadow: `0 20px 60px ${awayColor}35, inset 0 2px 0 rgba(255,255,255,0.15)`,
                  border: `2px solid ${awayColor}50`
                }}
              >
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black/30 to-transparent" />
                {away?.team?.logo ? (
                  <img
                    src={away.team.logo}
                    alt={away.team.displayName}
                    className="relative w-20 h-20 lg:w-24 lg:h-24 object-contain drop-shadow-2xl"
                  />
                ) : (
                  <span className="relative text-5xl">🏀</span>
                )}
              </div>
              <div className="font-display text-2xl lg:text-3xl font-bold text-white tracking-wide">
                {away?.team?.abbreviation || "TBD"}
              </div>
              <div className="text-sm text-white/60">
                {away?.team?.displayName || "Team"}
              </div>
            </div>

            {/* Score center */}
            <div className="flex flex-col items-center px-8">
              <div className="relative">
                {isLive && (
                  <div className="absolute inset-0 blur-2xl bg-gradient-to-r from-primary/30 via-transparent to-primary/30 animate-pulse" />
                )}
                <div className="relative flex items-center gap-6">
                  <span className={cn(
                    "font-display text-7xl lg:text-8xl font-bold tabular-nums transition-all",
                    isLive ? "text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" : "text-white/50"
                  )}>
                    {away?.score ?? "-"}
                  </span>
                  <div className="flex flex-col items-center gap-1">
                    <Zap className={cn(
                      "w-6 h-6",
                      isLive ? "text-yellow-400 animate-pulse" : "text-white/20"
                    )} />
                    <span className="text-xl text-white/20 font-light">VS</span>
                  </div>
                  <span className={cn(
                    "font-display text-7xl lg:text-8xl font-bold tabular-nums transition-all",
                    isLive ? "text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" : "text-white/50"
                  )}>
                    {home?.score ?? "-"}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="mt-4">
                {isPre ? (
                  <div className="flex flex-col items-center gap-2">
                    <EventCountdown targetDate={comp?.date || event.date} />
                    <div className="flex items-center gap-2 text-white/40 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(comp?.date || event.date).toLocaleDateString(undefined, {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={cn(
                    "px-4 py-2 rounded-full text-sm font-bold backdrop-blur-sm",
                    isLive && "bg-red-500/20 text-red-200 border border-red-500/30",
                    isFinal && "bg-white/10 text-white/60 border border-white/10"
                  )}>
                    {clockTxt}
                  </div>
                )}
              </div>
            </div>

            {/* Home team */}
            <div className="flex-1 flex flex-col items-center text-center">
              <div 
                className="relative w-32 h-32 lg:w-36 lg:h-36 rounded-3xl flex items-center justify-center mb-4 transition-all duration-500 group-hover:scale-110 group-hover:rotate-[3deg]"
                style={{
                  background: `linear-gradient(145deg, ${homeColor}45, ${homeColor}15)`,
                  boxShadow: `0 20px 60px ${homeColor}35, inset 0 2px 0 rgba(255,255,255,0.15)`,
                  border: `2px solid ${homeColor}50`
                }}
              >
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black/30 to-transparent" />
                {home?.team?.logo ? (
                  <img
                    src={home.team.logo}
                    alt={home.team.displayName}
                    className="relative w-20 h-20 lg:w-24 lg:h-24 object-contain drop-shadow-2xl"
                  />
                ) : (
                  <span className="relative text-5xl">🏀</span>
                )}
              </div>
              <div className="font-display text-2xl lg:text-3xl font-bold text-white tracking-wide">
                {home?.team?.abbreviation || "TBD"}
              </div>
              <div className="text-sm text-white/60">
                {home?.team?.displayName || "Team"}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-5 border-t border-white/10">
            <div className="flex items-center gap-3 text-white/40">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">
                {venue?.fullName || "Arena"}
                {venue?.address?.city && ` · ${venue.address.city}`}
              </span>
            </div>

            {hasLink && (
              <button
                onClick={(e) => { e.stopPropagation(); onClick(); }}
                className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-primary via-purple-500 to-accent text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all duration-300"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Ver Ahora</span>
                <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom shine */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
}
