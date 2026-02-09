import { Heart, Play, Link2Off, Clock, Trophy, Tv, Flame, Radio, Sparkles, Zap } from "lucide-react";
import { ESPNEvent } from "@/lib/api";
import { cn } from "@/lib/utils";
import { EventCountdown } from "./EventCountdown";
import { EventShareButton } from "./EventShareButton";
import { useState, useEffect } from "react";
import { toast } from "sonner";
// IMPORTANTE: Importamos el generador aquí
import { generateEmbedLinks } from "@/lib/embedLinkGenerator";

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
  hasLink: originalHasLink,
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

  // --- LÓGICA DE ACTIVACIÓN AUTOMÁTICA ---
  const [isTimeActivated, setIsTimeActivated] = useState(false);

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const gameDate = new Date(comp?.date || event.date);
      const diffInMinutes = (gameDate.getTime() - now.getTime()) / (1000 * 60);

      // Activar 15 minutos antes
      setIsTimeActivated(diffInMinutes <= 15 || isLive);
    };

    checkTime();
    const timer = setInterval(checkTime, 10000);
    return () => clearInterval(timer);
  }, [comp?.date, event.date, isLive]);

  // Si el Admin puso link O si ya es la hora, permitimos el clic
  const canWatch = originalHasLink || isTimeActivated;
  // ---------------------------------------

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

  const awayTeamName = away?.team?.displayName || "";
  const homeTeamName = home?.team?.displayName || "";

  const awayColor = away?.team?.color ? `#${away.team.color}` : "#8b5cf6";
  const homeColor = home?.team?.color ? `#${home.team.color}` : "#ec4899";

  return (
    <div
      className={cn(
        "group relative rounded-3xl overflow-hidden transition-all duration-700 border backdrop-blur-xl",
        isLive ? "border-red-500/50" : "border-white/[0.08]",
        canWatch && "cursor-pointer hover:scale-[1.02]",
      )}
      onClick={() => {
        if (canWatch) {
          onClick();
        } else {
          toast.info("El link se activa automáticamente 15 min antes del partido.");
        }
      }}
    >
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 to-black/90" />
      </div>

      <div className="relative p-4 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="text-white font-bold text-xs uppercase">{leagueInfo.name}</span>
          </div>
          <div
            className={cn(
              "px-3 py-1 rounded-lg text-[10px] font-bold border",
              isLive ? "bg-red-500/20 text-red-300 border-red-500/40" : "bg-white/10 text-white/40 border-white/10",
            )}
          >
            {isLive ? "LIVE" : isFinal ? "FINAL" : "PRÓXIMO"}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex-1 flex flex-col items-center">
            <img src={away?.team?.logo} className="w-16 h-16 object-contain" alt="" />
            <span className="mt-2 text-white font-bold">{away?.team?.abbreviation}</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="text-2xl font-bold text-white">
              {away?.score ?? "-"} <span className="text-xs text-white/20">VS</span> {home?.score ?? "-"}
            </div>
            <div className="text-[10px] text-white/40 mt-1">{clockTxt}</div>
          </div>

          <div className="flex-1 flex flex-col items-center">
            <img src={home?.team?.logo} className="w-16 h-16 object-contain" alt="" />
            <span className="mt-2 text-white font-bold">{home?.team?.abbreviation}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[10px] font-black",
              canWatch
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-white/5 border-white/10 text-white/30",
            )}
          >
            <Tv className="w-3 h-3" />
            {canWatch ? "SEÑAL ACTIVA" : "ESPERANDO..."}
          </div>

          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className={cn(
                "h-9 w-9 rounded-lg border flex items-center justify-center",
                isFavorite ? "bg-red-500/20 text-red-400" : "bg-white/5 text-white/40",
              )}
            >
              <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
            </button>

            <button
              className={cn(
                "h-9 px-4 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all border",
                canWatch ? "bg-primary text-white border-primary" : "bg-white/5 text-white/30",
              )}
            >
              {canWatch ? (
                <>
                  <Play className="w-3 h-3 fill-current" /> VER AHORA
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3" /> PRONTO
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
