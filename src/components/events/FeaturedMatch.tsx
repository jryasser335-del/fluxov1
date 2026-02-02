import { Play, Star, Flame, Radio, Calendar, MapPin } from "lucide-react";
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
        "relative w-full rounded-3xl overflow-hidden mb-8 cursor-pointer group",
        "border border-white/10 hover:border-white/20 transition-all duration-500"
      )}
      onClick={hasLink ? onClick : undefined}
    >
      {/* Animated gradient background */}
      <div 
        className="absolute inset-0 animate-gradient-shift"
        style={{
          background: `linear-gradient(135deg, ${awayColor}40 0%, transparent 30%, transparent 70%, ${homeColor}40 100%)`,
        }}
      />
      
      {/* Dark overlay with texture */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/80 to-black/90" />
      
      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-[100px] animate-pulse delay-1000" />
      </div>

      {/* Top shine line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

      {/* Featured badge */}
      <div className="absolute top-4 left-4 z-10">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 backdrop-blur-sm">
          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
          <span className="text-xs font-bold text-yellow-300 uppercase tracking-wider">
            Partido Destacado
          </span>
          <Flame className="w-3.5 h-3.5 text-orange-400" />
        </div>
      </div>

      {/* Live badge */}
      {isLive && (
        <div className="absolute top-4 right-4 z-10">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-destructive shadow-lg shadow-destructive/40 animate-pulse">
            <Radio className="w-4 h-4 text-white animate-pulse" />
            <span className="text-sm font-bold text-white uppercase tracking-wider">En Vivo</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative p-6 sm:p-10">
        {/* Main matchup */}
        <div className="flex items-center justify-between gap-4 sm:gap-8 mb-6">
          {/* Away team */}
          <div className="flex-1 flex flex-col items-center text-center">
            <div 
              className="relative w-24 h-24 sm:w-36 sm:h-36 rounded-3xl flex items-center justify-center mb-4 transition-all duration-500 group-hover:scale-110 group-hover:rotate-[-3deg]"
              style={{
                background: `linear-gradient(145deg, ${awayColor}50, ${awayColor}20)`,
                boxShadow: `0 20px 60px ${awayColor}40, inset 0 2px 0 rgba(255,255,255,0.2)`,
                border: `2px solid ${awayColor}60`
              }}
            >
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black/40 to-transparent" />
              {away?.team?.logo ? (
                <img
                  src={away.team.logo}
                  alt={away.team.displayName}
                  className="relative w-16 h-16 sm:w-24 sm:h-24 object-contain drop-shadow-2xl"
                />
              ) : (
                <span className="relative text-5xl sm:text-6xl">🏀</span>
              )}
            </div>
            <div className="font-display text-xl sm:text-3xl font-bold text-white tracking-wide">
              {away?.team?.abbreviation || "TBD"}
            </div>
            <div className="text-sm sm:text-base text-white/60">
              {away?.team?.displayName || "Team"}
            </div>
          </div>

          {/* Score center */}
          <div className="flex flex-col items-center px-4 sm:px-8">
            <div className="relative">
              {isLive && (
                <div className="absolute inset-0 blur-2xl bg-gradient-to-r from-primary/40 via-transparent to-primary/40 animate-pulse" />
              )}
              <div className="relative flex items-center gap-4 sm:gap-8">
                <span className={cn(
                  "font-display text-6xl sm:text-8xl font-bold tabular-nums transition-all",
                  isLive ? "text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]" : "text-white/60"
                )}>
                  {away?.score ?? "-"}
                </span>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl sm:text-3xl text-white/20 font-light">VS</span>
                </div>
                <span className={cn(
                  "font-display text-6xl sm:text-8xl font-bold tabular-nums transition-all",
                  isLive ? "text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]" : "text-white/60"
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
                  isLive && "bg-destructive/30 text-red-200 border border-destructive/30",
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
              className="relative w-24 h-24 sm:w-36 sm:h-36 rounded-3xl flex items-center justify-center mb-4 transition-all duration-500 group-hover:scale-110 group-hover:rotate-[3deg]"
              style={{
                background: `linear-gradient(145deg, ${homeColor}50, ${homeColor}20)`,
                boxShadow: `0 20px 60px ${homeColor}40, inset 0 2px 0 rgba(255,255,255,0.2)`,
                border: `2px solid ${homeColor}60`
              }}
            >
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black/40 to-transparent" />
              {home?.team?.logo ? (
                <img
                  src={home.team.logo}
                  alt={home.team.displayName}
                  className="relative w-16 h-16 sm:w-24 sm:h-24 object-contain drop-shadow-2xl"
                />
              ) : (
                <span className="relative text-5xl sm:text-6xl">🏀</span>
              )}
            </div>
            <div className="font-display text-xl sm:text-3xl font-bold text-white tracking-wide">
              {home?.team?.abbreviation || "TBD"}
            </div>
            <div className="text-sm sm:text-base text-white/60">
              {home?.team?.displayName || "Team"}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-white/10">
          {/* Venue info */}
          <div className="flex items-center gap-3 text-white/40">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">
              {venue?.fullName || "Arena"}
              {venue?.address?.city && ` · ${venue.address.city}`}
            </span>
          </div>

          {/* Watch button */}
          {hasLink && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-primary via-purple-500 to-pink-500 text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all duration-300"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Ver Ahora</span>
              <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom shine */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
}
