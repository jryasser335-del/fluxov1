import { useState, useMemo, useEffect, useRef } from "react";
import { Plus, X, Maximize2, Minimize2, Grid2X2, LayoutGrid, Search, Trophy, Play, Monitor, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useEventsStore, SharedEvent } from "@/hooks/useEventsStore";

interface StreamSlot {
  id: number;
  eventId: string | null;
  title: string;
  url: string;
  isActive: boolean;
  teamHome?: string;
  teamAway?: string;
  league?: string;
  leagueName?: string;
  isLive?: boolean;
}

const SPORT_EMOJI: Record<string, string> = {
  NBA: "🏀",
  NHL: "🏒",
  MLB: "⚾",
  Football: "⚽",
};

// ── RGB Falling Particles ─────────────────────────────────────────────────────
interface Particle {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  hue: number;
  opacity: number;
}

function RGBParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    // Initial burst
    const initial: Particle[] = Array.from({ length: 30 }, () => ({
      id: nextId.current++,
      x: Math.random() * 100,
      size: Math.random() * 5 + 2,
      duration: Math.random() * 4 + 3,
      delay: Math.random() * 4,
      hue: Math.floor(Math.random() * 360),
      opacity: Math.random() * 0.6 + 0.3,
    }));
    setParticles(initial);

    // Keep adding new particles
    const interval = setInterval(() => {
      setParticles((prev) => {
        const next = prev.filter((p) => p.delay + p.duration > 0); // keep alive
        const newParticle: Particle = {
          id: nextId.current++,
          x: Math.random() * 100,
          size: Math.random() * 5 + 2,
          duration: Math.random() * 4 + 3,
          delay: 0,
          hue: Math.floor(Math.random() * 360),
          opacity: Math.random() * 0.6 + 0.3,
        };
        return [...next.slice(-40), newParticle];
      });
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: "-10px",
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            background: `hsl(${p.hue}, 100%, 60%)`,
            boxShadow: `0 0 ${p.size * 2}px hsl(${p.hue}, 100%, 60%), 0 0 ${p.size * 4}px hsl(${p.hue}, 100%, 50%)`,
            animation: `fall-particle ${p.duration}s ${p.delay}s linear forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes fall-particle {
          0%   { transform: translateY(0px) rotate(0deg); opacity: var(--op, 0.8); }
          10%  { opacity: var(--op, 0.8); }
          90%  { opacity: var(--op, 0.4); }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export function MultiStreamView() {
  const [layout, setLayout] = useState<2 | 4>(4);
  const [slots, setSlots] = useState<StreamSlot[]>([
    { id: 1, eventId: null, title: "", url: "", isActive: false },
    { id: 2, eventId: null, title: "", url: "", isActive: false },
    { id: 3, eventId: null, title: "", url: "", isActive: false },
    { id: 4, eventId: null, title: "", url: "", isActive: false },
  ]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEventPicker, setShowEventPicker] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const allEvents = useEventsStore((s) => s.events);

  const selectedEventIds = useMemo(() => new Set(slots.map((s) => s.eventId).filter(Boolean) as string[]), [slots]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const sorted = [...allEvents].sort((a, b) => {
      const aLive = a.isLive ? 0 : 1;
      const bLive = b.isLive ? 0 : 1;
      if (aLive !== bLive) return aLive - bLive;
      const aLink = a.url1 ? 0 : 1;
      const bLink = b.url1 ? 0 : 1;
      return aLink - bLink;
    });
    return sorted.filter((event) => {
      if (selectedEventIds.has(event.id)) return false;
      if (!q) return true;
      const hay = `${event.name} ${event.teamHome} ${event.teamAway} ${event.leagueName}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allEvents, searchQuery, selectedEventIds]);

  const eventsWithLink = useMemo(() => filteredEvents.filter((e) => !!e.url1), [filteredEvents]);

  const handleSelectEvent = (slotId: number, event: SharedEvent) => {
    if (!event.url1) {
      toast.info("Este partido aún no tiene enlace disponible");
      return;
    }
    setSlots((prev) =>
      prev.map((slot) =>
        slot.id === slotId
          ? {
              ...slot,
              eventId: event.id,
              url: event.url1,
              title: event.name,
              teamHome: event.teamHome,
              teamAway: event.teamAway,
              league: event.league,
              leagueName: event.leagueName,
              isLive: event.isLive,
              isActive: true,
            }
          : slot,
      ),
    );
    setShowEventPicker(null);
    setSearchQuery("");
  };

  const handleRemoveStream = (slotId: number) => {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.id === slotId
          ? {
              ...slot,
              eventId: null,
              url: "",
              title: "",
              isActive: false,
              teamHome: undefined,
              teamAway: undefined,
              league: undefined,
              leagueName: undefined,
              isLive: undefined,
            }
          : slot,
      ),
    );
  };

  const formatStreamUrl = (url: string) => {
    if (!url) return "";
    if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}autoplay=1&auto_play=true&muted=0`;
  };

  const activeSlots = slots.filter((s) => s.isActive);
  const displaySlots = layout === 2 ? slots.slice(0, 2) : slots;

  return (
    <div className={cn("min-h-screen relative", isFullscreen && "fixed inset-0 z-50 bg-background p-3")}>
      {/* RGB Falling Particles */}
      <RGBParticles />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex items-center justify-between mb-5"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-primary" />
            </div>
            {activeSlots.length > 0 && (
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-background" />
            )}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Multi Stream</h1>
            <p className="text-[11px] text-muted-foreground/50">
              {activeSlots.length > 0
                ? `${activeSlots.length} de ${layout} streams activos`
                : "Añade partidos para ver en simultáneo"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            {([2, 4] as const).map((n) => (
              <button
                key={n}
                onClick={() => setLayout(n)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300",
                  layout === n
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.04]",
                )}
              >
                {n === 2 ? <Grid2X2 className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
                {n}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-9 w-9 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.06] transition-all duration-300"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </motion.div>

      {/* ── Grid — centered when layout=2 ── */}
      <div
        className={cn(
          "relative z-10",
          layout === 2 ? "flex justify-center gap-3" : "grid grid-cols-1 md:grid-cols-2 gap-3",
          isFullscreen && "h-[calc(100vh-80px)]",
        )}
      >
        {displaySlots.map((slot, index) => (
          <motion.div
            key={slot.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.06, duration: 0.3 }}
            className={cn(
              "relative rounded-2xl overflow-hidden transition-all duration-300 group aspect-video",
              layout === 2 ? "w-full max-w-[48%]" : "w-full",
              slot.isActive
                ? "border border-white/[0.08] bg-card shadow-xl"
                : "border border-dashed border-white/[0.06] bg-gradient-to-br from-white/[0.01] to-transparent hover:border-primary/20 hover:from-primary/[0.02]",
            )}
          >
            {slot.isActive ? (
              <>
                <iframe
                  src={formatStreamUrl(slot.url)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="absolute top-0 left-0 right-0 p-2.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="flex items-center gap-2">
                    {slot.isLive && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary shadow-lg shadow-primary/20">
                        <Radio className="w-2.5 h-2.5 text-primary-foreground animate-pulse" />
                        <span className="text-[9px] font-bold text-primary-foreground uppercase tracking-wider">
                          En Vivo
                        </span>
                      </div>
                    )}
                    <span className="text-[11px] font-semibold text-white truncate">{slot.title}</span>
                    {slot.leagueName && (
                      <span className="text-[9px] text-white/40 truncate hidden sm:block px-1.5 py-0.5 rounded bg-white/10">
                        {slot.leagueName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="absolute bottom-2 left-2 w-6 h-6 rounded-lg bg-black/50 border border-white/10 flex items-center justify-center pointer-events-none backdrop-blur-sm">
                  <span className="text-[10px] font-bold text-white/50">{slot.id}</span>
                </div>
                <button
                  onClick={() => handleRemoveStream(slot.id)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/50 hover:bg-destructive border border-white/10 hover:border-destructive flex items-center justify-center text-white/50 hover:text-white transition-all z-10 opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <AnimatePresence mode="wait">
                {showEventPicker === slot.id ? (
                  <motion.div
                    key="picker"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col p-3 bg-card overflow-hidden"
                  >
                    <div className="relative mb-2.5">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar partido..."
                        className="pl-10 h-9 bg-white/[0.02] border-white/[0.06] focus:border-primary/30 text-sm rounded-xl"
                        autoFocus
                      />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-hide">
                      {allEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-24 text-muted-foreground/30 gap-1.5">
                          <Trophy className="w-5 h-5" />
                          <span className="text-[11px] font-medium">Ve a la pestaña Live primero</span>
                          <span className="text-[10px] text-muted-foreground/20">
                            Los partidos aparecerán aquí automáticamente
                          </span>
                        </div>
                      ) : filteredEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-20 text-muted-foreground/30">
                          <Trophy className="w-5 h-5 mb-1.5" />
                          <span className="text-[11px] font-medium">No se encontraron partidos</span>
                        </div>
                      ) : (
                        filteredEvents.map((event) => {
                          const hasLink = !!event.url1;
                          const emoji = SPORT_EMOJI[event.sport] ?? "🏟️";
                          return (
                            <button
                              key={event.id}
                              onClick={() => handleSelectEvent(slot.id, event)}
                              disabled={!hasLink}
                              className={cn(
                                "w-full p-2.5 rounded-xl border transition-all text-left group/item",
                                hasLink
                                  ? "bg-white/[0.02] hover:bg-primary/[0.05] border-white/[0.04] hover:border-primary/20 cursor-pointer"
                                  : "bg-white/[0.01] border-white/[0.02] opacity-40 cursor-not-allowed",
                              )}
                            >
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={cn(
                                    "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 text-base transition-colors",
                                    hasLink
                                      ? "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/10 group-hover/item:border-primary/25"
                                      : "bg-white/[0.03] border-white/[0.05]",
                                  )}
                                >
                                  {hasLink ? <Play className="w-3.5 h-3.5 text-primary" /> : <span>{emoji}</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[12px] font-semibold text-foreground truncate">
                                      {event.name}
                                    </span>
                                    {event.isLive && (
                                      <span className="px-1.5 py-0.5 rounded-md bg-primary/15 border border-primary/20 text-[8px] font-bold text-primary uppercase shrink-0">
                                        Live
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40 mt-0.5">
                                    <span className="text-primary/60">{event.leagueName}</span>
                                    {!hasLink && (
                                      <>
                                        <span>•</span>
                                        <span className="text-muted-foreground/30">Sin enlace aún</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                {hasLink && <div className="w-2 h-2 rounded-full bg-success/80 shrink-0" />}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setShowEventPicker(null);
                        setSearchQuery("");
                      }}
                      className="mt-2 w-full py-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-muted-foreground/50 text-xs font-medium hover:bg-white/[0.05] hover:text-foreground/70 transition-all"
                    >
                      Cancelar
                    </button>
                  </motion.div>
                ) : (
                  <motion.button
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowEventPicker(slot.id)}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 group/add"
                  >
                    <div className="absolute top-3 left-3 w-6 h-6 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
                      <span className="text-[10px] font-bold text-muted-foreground/20">{slot.id}</span>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/[0.05] to-primary/[0.02] border border-dashed border-primary/15 flex items-center justify-center group-hover/add:border-primary/30 group-hover/add:from-primary/[0.08] transition-all duration-300">
                      <Plus className="w-6 h-6 text-muted-foreground/25 group-hover/add:text-primary transition-colors duration-300" />
                    </div>
                    <div className="text-center">
                      <span className="block text-xs font-medium text-muted-foreground/30 group-hover/add:text-foreground/60 transition-colors">
                        Añadir Stream
                      </span>
                      <span className="block text-[10px] text-muted-foreground/20 mt-0.5">
                        {eventsWithLink.length > 0
                          ? `${eventsWithLink.length} disponibles`
                          : allEvents.length > 0
                            ? `${allEvents.length} partidos`
                            : "Ve a Live primero"}
                      </span>
                    </div>
                  </motion.button>
                )}
              </AnimatePresence>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
