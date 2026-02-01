import { Heart, Play, Link2Off, Clock, Trophy } from "lucide-react";
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

  return (
    <div
      className={cn(
        "group relative rounded-2xl overflow-hidden transition-all duration-300",
        "bg-gradient-to-br from-white/[0.07] via-white/[0.04] to-transparent",
        "border border-white/[0.08] hover:border-primary/40",
        "hover:-translate-y-1 hover:shadow-[0_20px_50px_-15px_hsl(270_100%_50%/0.25)]",
        hasLink && "cursor-pointer"
      )}
      onClick={hasLink ? onClick : undefined}
    >
      {/* Gradient glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/5" />
      </div>

      {/* Top shine effect */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Content */}
      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/10 border border-primary/20 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs font-semibold text-foreground/90 leading-tight">
                {leagueInfo.name}
              </div>
              {leagueInfo.sub && leagueInfo.sub !== leagueInfo.name && (
                <div className="text-[10px] text-muted-foreground">{leagueInfo.sub}</div>
              )}
            </div>
          </div>

          {/* Status badge */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide",
              isLive && "bg-destructive/20 text-red-300 border border-destructive/30",
              isFinal && "bg-white/10 text-white/60 border border-white/10",
              isPre && "bg-primary/15 text-primary border border-primary/25"
            )}
          >
            {isLive && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
              </span>
            )}
            {isPre && <Clock className="w-3 h-3" />}
            {isLive ? "EN VIVO" : isFinal ? "FINAL" : "PRONTO"}
          </div>
        </div>

        {/* Match card */}
        <div className="relative rounded-xl bg-black/40 border border-white/[0.06] p-3 backdrop-blur-sm">
          {/* Teams grid */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            {/* Away team */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {away?.team?.logo ? (
                  <img
                    src={away.team.logo}
                    alt={away.team.displayName}
                    className="w-9 h-9 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span className="text-lg">🏀</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm leading-tight truncate">
                  {away?.team?.shortDisplayName || "TBD"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {away?.team?.abbreviation}
                </div>
              </div>
            </div>

            {/* Score */}
            <div className="flex flex-col items-center px-3">
              <div className="flex items-center gap-2 font-display text-2xl tracking-wider">
                <span className={cn(isLive && "text-foreground", !isLive && "text-white/60")}>
                  {away?.score ?? "—"}
                </span>
                <span className="text-white/30">:</span>
                <span className={cn(isLive && "text-foreground", !isLive && "text-white/60")}>
                  {home?.score ?? "—"}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 whitespace-nowrap">
                {clockTxt}
              </div>
            </div>

            {/* Home team */}
            <div className="flex items-center gap-2.5 justify-end min-w-0 text-right">
              <div className="min-w-0">
                <div className="font-semibold text-sm leading-tight truncate">
                  {home?.team?.shortDisplayName || "TBD"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {home?.team?.abbreviation}
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {home?.team?.logo ? (
                  <img
                    src={home.team.logo}
                    alt={home.team.displayName}
                    className="w-9 h-9 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span className="text-lg">🏀</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 gap-2">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            {formatTime(comp?.date || event.date)}
          </div>

          <div className="flex gap-2">
            {/* Favorite button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className={cn(
                "h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200",
                "border hover:-translate-y-0.5",
                isFavorite
                  ? "bg-destructive/15 border-destructive/30 text-destructive"
                  : "bg-white/[0.04] border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20"
              )}
            >
              <Heart
                className={cn("w-4 h-4", isFavorite && "fill-current")}
              />
            </button>

            {/* Play/No link button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hasLink) onClick();
              }}
              className={cn(
                "h-9 px-4 rounded-xl flex items-center gap-2 text-xs font-medium transition-all duration-200",
                "border hover:-translate-y-0.5",
                hasLink
                  ? "bg-gradient-to-r from-primary/20 to-purple-500/15 border-primary/30 text-primary hover:border-primary/50"
                  : "bg-white/[0.04] border-white/10 text-muted-foreground"
              )}
            >
              {hasLink ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Ver
                </>
              ) : (
                <>
                  <Link2Off className="w-3.5 h-3.5" />
                  Sin link
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
