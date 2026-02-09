import { Heart, Play, Link2Off, Clock, Trophy, Tv, Flame, Radio, Sparkles, Zap } from "lucide-react";
import { ESPNEvent } from "@/lib/api";
import { cn } from "@/lib/utils";
import { EventCountdown } from "./EventCountdown";
import { EventShareButton } from "./EventShareButton";
import { useState, useEffect } from "react";

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
  hasLink: originalHasLink, // Renombramos la prop original
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

  // --- LÓGICA DE AUTO-ACTIVACIÓN ---
  const [isTimeActivated, setIsTimeActivated] = useState(false);

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const gameDate = new Date(comp?.date || event.date);
      const diffInMinutes = (gameDate.getTime() - now.getTime()) / (1000 * 60);

      // Se activa si faltan 15 min o si ya empezó/terminó
      setIsTimeActivated(diffInMinutes <= 15);
    };

    checkTime();
    const timer = setInterval(checkTime, 30000); // Revisa cada 30 segundos
    return () => clearInterval(timer);
  }, [comp?.date, event.date]);

  // Si tiene link manual O si ya es la hora del partido, mostramos el botón de VER
  const hasLink = originalHasLink || isTimeActivated;
  // --------------------------------

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
        hasLink && "cursor-pointer hover:scale-[1.02] hover:shadow-[0_20px_60px_-15px] hover:shadow-primary/30",
      )}
      onClick={hasLink ? onClick : undefined}
    >
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 opacity-60 transition-opacity duration-700 group-hover:opacity-80"
          style={{
            background: `
              radial-gradient(ellipse 120% 80% at 0% 0%, ${awayColor}40 0%, transparent 50%),
              radial-gradient(ellipse 120% 80% at 100% 100%, ${homeColor}40 0%, transparent 50%),
              radial-gradient(ellipse 80% 50% at 50% 100%, ${awayAltColor}20 0%, transparent 60%)
            `,
          }}
        />
        <div
          className="absolute w-40 h-40 rounded-full blur-3xl opacity-30 animate-pulse"
          style={{
            background: `radial-gradient(circle, ${awayColor} 0%, transparent 70%)`,
            top: "-20%",
            left: "-10%",
            animationDuration: "4s",
          }}
        />
        <div
          className="absolute w-40 h-40 rounded-full blur-3xl opacity-30 animate-pulse"
          style={{
            background: `radial-gradient(circle, ${homeColor} 0%, transparent 70%)`,
            bottom: "-20%",
            right: "-10%",
            animationDuration: "5s",
            animationDelay: "1s",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/80 to-black/90" />
        <div className="absolute inset-0 opacity-[0.015] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIvPjwvc3ZnPg==')]" />
      </div>

      {isLive && (
        <>
          <div className="absolute inset-0 rounded-3xl border-2 border-red-500/50 animate-pulse" />
          <div className="absolute inset-[-2px] rounded-3xl bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20 blur-sm animate-pulse" />
        </>
      )}

      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
      <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-tl-3xl" />

      <div className="relative p-4 sm:p-6">
        {showFeaturedBadge && (
          <div className="absolute -top-1 right-4 z-10">
            <div
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-b-xl text-[10px] font-black uppercase tracking-widest shadow-2xl",
                isLive
                  ? "bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white shadow-red-500/50"
                  : "bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-black shadow-amber-500/50",
              )}
            >
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

          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold tracking-wide uppercase",
              "border shadow-lg backdrop-blur-sm",
              isLive && "bg-red-500/20 text-red-300 border-red-500/40 shadow-red-500/20",
              isFinal && "bg-white/10 text-white/60 border-white/10",
              isPre && "bg-primary/20 text-primary border-primary/40 shadow-primary/20",
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

        <div className="flex items-center justify-between gap-2 sm:gap-4 mb-4">
          <div className="flex-1 flex flex-col items-center text-center min-w-0">
            <div className="relative group/team">
              <div
                className="absolute inset-0 blur-xl opacity-40 transition-opacity group-hover/team:opacity-60"
                style={{ background: awayColor }}
              />
              <div
                className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-105"
                style={{
                  background: `linear-gradient(145deg, ${awayColor}40, ${awayColor}15)`,
                  border: `2px solid ${awayColor}50`,
                  boxShadow: `0 10px 25px -8px ${awayColor}35`,
                }}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/30 to-transparent" />
                {away?.team?.logo ? (
                  <img
                    src={away.team.logo}
                    alt={away.team.displayName}
                    className="relative w-10 h-10 sm:w-14 sm:h-14 object-contain drop-shadow-lg"
                  />
                ) : (
                  <span className="relative text-2xl sm:text-3xl">🏀</span>
                )}
              </div>
            </div>
            <div className="mt-2 font-display text-base sm:text-lg font-bold text-white tracking-wide">
              {away?.team?.abbreviation || "TBD"}
            </div>
            <div className="text-[9px] sm:text-[10px] text-white/50 truncate max-w-full">
              {away?.team?.shortDisplayName || "Team"}
            </div>
            {awayRecord && (
              <div className="mt-0.5 text-[8px] sm:text-[9px] text-white/30 font-medium">{awayRecord}</div>
            )}
          </div>

          <div className="flex flex-col items-center px-1 sm:px-4 flex-shrink-0">
            <div className="relative flex items-center gap-2 sm:gap-3">
              <span
                className={cn(
                  "font-display text-3xl sm:text-5xl font-bold tabular-nums transition-all",
                  isLive ? "text-white" : "text-white/40",
                )}
              >
                {away?.score ?? "-"}
              </span>
              <div className="flex flex-col items-center">
                <Zap className={cn("w-3 h-3 sm:w-4 sm:h-4", isLive ? "text-primary" : "text-white/20")} />
                <span className="text-[9px] sm:text-[10px] text-white/20 font-medium">VS</span>
              </div>
              <span
                className={cn(
                  "font-display text-3xl sm:text-5xl font-bold tabular-nums transition-all",
                  isLive ? "text-white" : "text-white/40",
                )}
              >
                {home?.score ?? "-"}
              </span>
            </div>
            <div className="mt-2">
              {isPre ? (
                <EventCountdown targetDate={comp?.date || event.date} compact />
              ) : (
                <div
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold",
                    isLive && "bg-red-500/20 text-red-200 border border-red-500/30",
                    isFinal && "bg-white/5 text-white/40",
                  )}
                >
                  {clockTxt}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center text-center min-w-0">
            <div className="relative group/team">
              <div
                className="absolute inset-0 blur-xl opacity-40 transition-opacity group-hover/team:opacity-60"
                style={{ background: homeColor }}
              />
              <div
                className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-105"
                style={{
                  background: `linear-gradient(145deg, ${homeColor}40, ${homeColor}15)`,
                  border: `2px solid ${homeColor}50`,
                  boxShadow: `0 10px 25px -8px ${homeColor}35`,
                }}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/30 to-transparent" />
                {home?.team?.logo ? (
                  <img
                    src={home.team.logo}
                    alt={home.team.displayName}
                    className="relative w-10 h-10 sm:w-14 sm:h-14 object-contain drop-shadow-lg"
                  />
                ) : (
                  <span className="relative text-2xl sm:text-3xl">🏀</span>
                )}
              </div>
            </div>
            <div className="mt-2 font-display text-base sm:text-lg font-bold text-white tracking-wide">
              {home?.team?.abbreviation || "TBD"}
            </div>
            <div className="text-[9px] sm:text-[10px] text-white/50 truncate max-w-full">
              {home?.team?.shortDisplayName || "Team"}
            </div>
            {homeRecord && (
              <div className="mt-0.5 text-[8px] sm:text-[9px] text-white/30 font-medium">{homeRecord}</div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/[0.08]">
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-lg border",
                hasLink ? "bg-emerald-500/10 border-emerald-500/30" : "bg-white/5 border-white/10",
              )}
            >
              {hasLink ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <Tv className="w-3 h-3 text-emerald-400" />
                  <span className="text-[9px] sm:text-[10px] font-semibold text-emerald-400 hidden sm:inline">
                    SEÑAL ACTIVA
                  </span>
                </>
              ) : (
                <>
                  <Tv className="w-3 h-3 text-white/30" />
                  <span className="text-[9px] sm:text-[10px] font-medium text-white/30 hidden sm:inline">
                    ESPERANDO...
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-1.5 flex-shrink-0">
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
                "h-8 w-8 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center transition-all",
                "border",
                isFavorite
                  ? "bg-red-500/20 border-red-500/40 text-red-400"
                  : "bg-white/5 border-white/10 text-white/40 hover:text-white",
              )}
            >
              <Heart className={cn("w-3.5 h-3.5", isFavorite && "fill-current")} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hasLink) onClick();
              }}
              className={cn(
                "h-8 sm:h-9 px-3 sm:px-4 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all",
                "border",
                hasLink
                  ? "bg-gradient-to-r from-primary to-accent text-white border-primary/50 hover:scale-105 active:scale-95"
                  : "bg-white/5 border-white/10 text-white/30 cursor-not-allowed",
              )}
            >
              {hasLink ? (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  <span>VER AHORA</span>
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3" />
                  <span>PRONTO</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
}
