import { Heart, Play, Clock, Tv } from "lucide-react";
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

  return (
    <div
      className={cn(
        "group relative rounded-2xl overflow-hidden transition-all duration-500",
        "border backdrop-blur-sm",
        isLive
          ? "border-red-500/40 shadow-[0_0_30px_-8px] shadow-red-500/30"
          : "border-white/[0.08] hover:border-white/15",
        hasLink && "cursor-pointer hover:scale-[1.02] hover:shadow-[0_10px_40px_-10px] hover:shadow-primary/20"
      )}
      onClick={hasLink ? onClick : undefined}
    >
      {/* Background with team color gradient - ppv.to style */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 opacity-50 transition-opacity duration-500 group-hover:opacity-70"
          style={{
            background: `linear-gradient(135deg, ${awayColor}35 0%, transparent 50%, ${homeColor}35 100%)`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1117]/60 via-[#0d1117]/80 to-[#0d1117]/95" />
      </div>

      {/* Live pulse border */}
      {isLive && (
        <div className="absolute inset-0 rounded-2xl border border-red-500/40 animate-pulse" />
      )}

      <div className="relative">
        {/* Logos area - face to face centered */}
        <div className="flex items-center justify-center gap-6 pt-8 pb-6 px-6">
          {/* Away logo */}
          <div className="flex-shrink-0">
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110"
              style={{
                background: `linear-gradient(145deg, ${awayColor}30, ${awayColor}10)`,
                border: `1.5px solid ${awayColor}40`
              }}
            >
              {away?.team?.logo ? (
                <img
                  src={away.team.logo}
                  alt={away.team.displayName}
                  className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-lg"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <span className="text-3xl">⚽</span>
              )}
            </div>
          </div>

          {/* League logo / VS center */}
          <div className="flex flex-col items-center gap-1.5">
            {isLive ? (
              <div className="flex items-center gap-2">
                <span className="font-display text-3xl font-bold text-white tabular-nums">
                  {away?.score ?? "0"}
                </span>
                <span className="text-sm text-white/30">-</span>
                <span className="font-display text-3xl font-bold text-white tabular-nums">
                  {home?.score ?? "0"}
                </span>
              </div>
            ) : (
              <span className="text-sm font-bold text-white/25">VS</span>
            )}
          </div>

          {/* Home logo */}
          <div className="flex-shrink-0">
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110"
              style={{
                background: `linear-gradient(145deg, ${homeColor}30, ${homeColor}10)`,
                border: `1.5px solid ${homeColor}40`
              }}
            >
              {home?.team?.logo ? (
                <img
                  src={home.team.logo}
                  alt={home.team.displayName}
                  className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-lg"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <span className="text-3xl">⚽</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer: Event name left, time right - ppv.to style */}
        <div className="px-5 pb-4">
          <div className="flex items-end justify-between gap-3">
            {/* Left: Event name + league */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white leading-tight truncate">
                {away?.team?.displayName || "TBD"} vs. {home?.team?.displayName || "TBD"}
              </h3>
              <p className="text-[11px] text-white/40 mt-0.5 truncate">{leagueInfo.name}</p>
            </div>

            {/* Right: Status / Time */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isLive ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-red-400">{clockTxt}</span>
                </div>
              ) : isPre ? (
                <EventCountdown targetDate={comp?.date || event.date} compact />
              ) : (
                <span className="text-xs text-white/40 font-mono">{clockTxt}</span>
              )}
            </div>
          </div>

          {/* Action row */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
            <div className="flex items-center gap-1.5">
              {hasLink ? (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-semibold text-emerald-400">Disponible</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5">
                  <Tv className="w-3 h-3 text-white/25" />
                  <span className="text-[9px] text-white/25">Sin señal</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                className={cn(
                  "w-7 h-7 rounded-md flex items-center justify-center transition-all border",
                  isFavorite
                    ? "bg-red-500/15 border-red-500/30 text-red-400"
                    : "bg-white/5 border-white/10 text-white/30 hover:text-white/60"
                )}
              >
                <Heart className={cn("w-3 h-3", isFavorite && "fill-current")} />
              </button>

              {hasLink && (
                <button
                  onClick={(e) => { e.stopPropagation(); onClick(); }}
                  className="h-7 px-3 rounded-md flex items-center gap-1 bg-primary/90 hover:bg-primary text-white text-[10px] font-bold transition-all hover:scale-105"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Ver
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
