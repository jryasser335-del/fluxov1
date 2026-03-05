import { Heart, Radio } from "lucide-react";
import { ESPNEvent } from "@/lib/api";
import { cn } from "@/lib/utils";

interface EventCardProps {
  event: ESPNEvent;
  leagueInfo: { name: string; sub: string; logo?: string };
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

  const viewerCount = hasLink && isLive ? Math.floor(Math.random() * 50 + 10) : hasLink ? Math.floor(Math.random() * 30 + 1) : 0;

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
        {/* Team logos with league logo in center - BINTV style */}
        <div className="flex items-center justify-center gap-2 flex-1 py-2">
          {/* Away team logo */}
          <div className="flex-shrink-0 w-14 h-14 sm:w-[68px] sm:h-[68px] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            {away?.team?.logo ? (
              <img
                src={away.team.logo}
                alt={away.team.displayName}
                className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                onError={(e) => { (e.target as HTMLImageElement).src = ""; (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden"); }}
              />
            ) : null}
            <div className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center font-display text-xl text-white/80",
              away?.team?.logo ? "hidden" : ""
            )} style={{ background: `${awayColor}40` }}>
              {(away?.team?.abbreviation || away?.team?.shortDisplayName || "?").slice(0, 3)}
            </div>
          </div>

          {/* Center: League logo + Score/VS */}
          <div className="flex flex-col items-center gap-1 min-w-[55px]">
            {leagueInfo.logo && (
              <img
                src={leagueInfo.logo}
                alt={leagueInfo.name}
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain opacity-70 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
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
            ) : !leagueInfo.logo ? (
              <span className="text-[10px] font-bold text-white/15 tracking-widest">VS</span>
            ) : null}
          </div>

          {/* Home team logo */}
          <div className="flex-shrink-0 w-14 h-14 sm:w-[68px] sm:h-[68px] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            {home?.team?.logo ? (
              <img
                src={home.team.logo}
                alt={home.team.displayName}
                className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                onError={(e) => { (e.target as HTMLImageElement).src = ""; (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden"); }}
              />
            ) : null}
            <div className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center font-display text-xl text-white/80",
              home?.team?.logo ? "hidden" : ""
            )} style={{ background: `${homeColor}40` }}>
              {(home?.team?.abbreviation || home?.team?.shortDisplayName || "?").slice(0, 3)}
            </div>
          </div>
        </div>

        {/* Footer - BINTV style */}
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
