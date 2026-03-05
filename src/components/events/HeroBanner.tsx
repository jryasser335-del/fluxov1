import { useMemo } from "react";
import { ESPNEvent } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Radio, Play, Trophy } from "lucide-react";
import { EventCountdown } from "./EventCountdown";
import { motion } from "framer-motion";

interface HeroBannerProps {
  event: ESPNEvent;
  leagueInfo: { key: string; name: string; sub: string; logo?: string };
  hasLink: boolean;
  onClick: () => void;
}

export function HeroBanner({ event, leagueInfo, hasLink, onClick }: HeroBannerProps) {
  const comp = event.competitions?.[0];
  const status = comp?.status?.type;
  const isLive = status?.state === "in";
  const isPre = status?.state === "pre";
  const competitors = comp?.competitors || [];
  const away = competitors.find((c) => c.homeAway === "away") || competitors[0];
  const home = competitors.find((c) => c.homeAway === "home") || competitors[1];

  const awayColor = away?.team?.color ? `#${away.team.color}` : "#1e3a5f";
  const homeColor = home?.team?.color ? `#${home.team.color}` : "#5f1e1e";

  const awayLogo = away?.team?.logo;
  const homeLogo = home?.team?.logo;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative rounded-2xl overflow-hidden mb-6",
        hasLink && "cursor-pointer"
      )}
      onClick={hasLink ? onClick : undefined}
    >
      {/* Background */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${awayColor}70 0%, #060608 45%, #060608 55%, ${homeColor}70 100%)`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/50" />
        {/* Glow orbs */}
        <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-60 h-60 rounded-full blur-[80px] opacity-30" style={{ background: awayColor }} />
        <div className="absolute -right-20 top-1/2 -translate-y-1/2 w-60 h-60 rounded-full blur-[80px] opacity-30" style={{ background: homeColor }} />
      </div>

      {/* Live bar */}
      {isLive && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-gradient-shift" style={{ backgroundSize: '200% 100%' }} />
      )}

      <div className="relative px-6 sm:px-10 py-8 sm:py-12">
        {/* Top badge */}
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            {isLive ? "Live Now" : "Featured Match"}
          </span>
          {isLive && (
            <div className="flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-primary/15">
              <Radio className="w-3 h-3 text-primary animate-pulse" />
              <span className="text-[10px] font-bold text-primary">LIVE</span>
            </div>
          )}
        </div>

        {/* Teams face-off */}
        <div className="flex items-center justify-between gap-4">
          {/* Away */}
          <motion.div
            className="flex-1 flex flex-col items-center gap-3"
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {awayLogo ? (
              <img src={awayLogo} alt={away?.team?.displayName || ""} className="w-20 h-20 sm:w-28 sm:h-28 object-contain drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]" />
            ) : (
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full flex items-center justify-center font-display text-3xl text-white/80 border-2 border-white/10" style={{ background: `${awayColor}60` }}>
                {(away?.team?.abbreviation || "?").slice(0, 3)}
              </div>
            )}
            <span className="text-sm sm:text-base font-semibold text-white/80 text-center">
              {away?.team?.displayName || "TBD"}
            </span>
          </motion.div>

          {/* Center */}
          <div className="flex flex-col items-center gap-2 min-w-[80px]">
            {leagueInfo.logo && (
              <img src={leagueInfo.logo} alt={leagueInfo.name} className="w-10 h-10 object-contain opacity-60 mb-1" />
            )}
            {isLive ? (
              <div className="flex items-center gap-3">
                <span className="font-display text-5xl sm:text-6xl text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">{away?.score ?? "0"}</span>
                <span className="text-white/20 text-xl">–</span>
                <span className="font-display text-5xl sm:text-6xl text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">{home?.score ?? "0"}</span>
              </div>
            ) : (
              <span className="font-display text-3xl text-white/20 tracking-[0.5em]">VS</span>
            )}
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
              {leagueInfo.sub}
            </span>
          </div>

          {/* Home */}
          <motion.div
            className="flex-1 flex flex-col items-center gap-3"
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {homeLogo ? (
              <img src={homeLogo} alt={home?.team?.displayName || ""} className="w-20 h-20 sm:w-28 sm:h-28 object-contain drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]" />
            ) : (
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full flex items-center justify-center font-display text-3xl text-white/80 border-2 border-white/10" style={{ background: `${homeColor}60` }}>
                {(home?.team?.abbreviation || "?").slice(0, 3)}
              </div>
            )}
            <span className="text-sm sm:text-base font-semibold text-white/80 text-center">
              {home?.team?.displayName || "TBD"}
            </span>
          </motion.div>
        </div>

        {/* Bottom: countdown or watch button */}
        <div className="flex items-center justify-center mt-6 gap-4">
          {isPre && <EventCountdown targetDate={comp?.date || event.date} />}
          {hasLink && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/30"
            >
              <Play className="w-4 h-4 fill-current" />
              {isLive ? "Watch Now" : "Watch"}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
