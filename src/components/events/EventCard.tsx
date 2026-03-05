import { Heart, Radio } from "lucide-react";
import { ESPNEvent } from "@/lib/api";
import { cn } from "@/lib/utils";

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
  const awayColor = awayTeam?.color ? `#${awayTeam.color}` : "#3b82f6";
  const homeColor = homeTeam?.color ? `#${homeTeam.color}` : "#ef4444";

  // Simulated viewer count
  const viewerCount = hasLink && isLive ? Math.floor(Math.random() * 50 + 10) : hasLink ? Math.floor(Math.random() * 30 + 1) : 0;

  return (
    <div
      className={cn(
        "group relative rounded-xl overflow-hidden transition-all duration-300 aspect-[16/9]",
        isLive
          ? "ring-1 ring-red-500/40 shadow-[0_0_15px_-5px] shadow-red-500/30"
          : "ring-1 ring-white/[0.06] hover:ring-white/[0.12]",
        hasLink && "cursor-pointer hover:scale-[1.02]"
      )}
      onClick={hasLink ? onClick : undefined}
    >
      {/* Background gradient from team colors */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 opacity-50 group-hover:opacity-70 transition-opacity duration-500"
          style={{
            background: `linear-gradient(135deg, ${awayColor}50 0%, #0a0a0a 40%, #0a0a0a 60%, ${homeColor}50 100%)`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-black/90" />
      </div>

      {/* Viewer badge */}
      {hasLink && viewerCount > 0 && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/90">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-[10px] font-bold text-white">{viewerCount}</span>
        </div>
      )}

      {/* Favorite */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        className={cn(
          "absolute top-2 left-2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all",
          isFavorite
            ? "bg-red-500/20 text-red-400"
            : "bg-black/40 text-white/20 opacity-0 group-hover:opacity-100"
        )}
      >
        <Heart className={cn("w-3.5 h-3.5", isFavorite && "fill-current")} />
      </button>

      <div className="relative h-full flex flex-col justify-between p-4">
        {/* Team logos centered */}
        <div className="flex items-center justify-center gap-3 flex-1">
          {/* Away logo */}
          <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            {away?.team?.logo ? (
              <img
                src={away.team.logo}
                alt={away.team.displayName}
                className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/40 font-display text-lg">
                {(away?.team?.abbreviation || "?")[0]}
              </div>
            )}
          </div>

          {/* Score or VS */}
          <div className="flex flex-col items-center gap-0.5 min-w-[60px]">
            {isLive ? (
              <div className="flex items-center gap-2">
                <span className="font-display text-3xl text-white">{away?.score ?? "0"}</span>
                <span className="text-white/20 text-sm">-</span>
                <span className="font-display text-3xl text-white">{home?.score ?? "0"}</span>
              </div>
            ) : isFinal ? (
              <div className="flex items-center gap-2">
                <span className="font-display text-2xl text-white/50">{away?.score ?? "0"}</span>
                <span className="text-white/15 text-xs">-</span>
                <span className="font-display text-2xl text-white/50">{home?.score ?? "0"}</span>
              </div>
            ) : (
              <span className="text-xs font-bold text-white/15 tracking-widest">VS</span>
            )}
          </div>

          {/* Home logo */}
          <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            {home?.team?.logo ? (
              <img
                src={home.team.logo}
                alt={home.team.displayName}
                className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/40 font-display text-lg">
                {(home?.team?.abbreviation || "?")[0]}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div>
          {/* Badges */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
              isLive ? "bg-red-500/20 text-red-400" : "bg-primary/20 text-primary"
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

          {/* Title */}
          <h3 className="text-[12px] sm:text-[13px] font-semibold text-white leading-tight truncate">
            {away?.team?.displayName || "TBD"} vs. {home?.team?.displayName || "TBD"}
          </h3>

          {/* Subtitle */}
          <p className="text-[10px] text-white/25 mt-0.5 truncate">
            {isPre ? clockTxt : isFinal ? clockTxt : leagueInfo.name}
          </p>
        </div>
      </div>
    </div>
  );
}
