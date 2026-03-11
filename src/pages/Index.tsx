import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Plus,
  X,
  Maximize2,
  Minimize2,
  Grid2X2,
  LayoutGrid,
  Search,
  Trophy,
  Play,
  Monitor,
  Radio,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface MatchEvent {
  id: string;
  name: string;
  url1: string;
  leagueName: string;
  isLive: boolean;
}

interface StreamSlot {
  id: number;
  eventId: string | null;
  title: string;
  url: string;
  isActive: boolean;
  leagueName?: string;
  isLive?: boolean;
}

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
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id,name,team_home,team_away,stream_url,league,sport,is_live")
        .eq("is_active", true)
        .not("stream_url", "is", null);

      if (error) throw error;

      const mapped: MatchEvent[] = (data ?? [])
        .filter((d) => !!d.stream_url)
        .map((d) => ({
          id: d.id,
          name: d.name || `${d.team_home ?? "TBD"} vs ${d.team_away ?? "TBD"}`,
          url1: d.stream_url!,
          leagueName: d.league ?? d.sport ?? "Sport",
          isLive: d.is_live ?? false,
        }))
        .sort((a, b) => (a.isLive === b.isLive ? 0 : a.isLive ? -1 : 1));

      setEvents(mapped);
    } catch (e) {
      console.error(e);
      toast.error("Error al cargar partidos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const ch = supabase
      .channel("multistream-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, loadEvents)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [loadEvents]);

  const selectedEventIds = useMemo(() => new Set(slots.map((s) => s.eventId).filter(Boolean) as string[]), [slots]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((e) => {
      if (selectedEventIds.has(e.id)) return false;
      if (!q) return true;
      return `${e.name} ${e.leagueName}`.toLowerCase().includes(q);
    });
  }, [events, searchQuery, selectedEventIds]);

  const handleSelectEvent = (slotId: number, event: MatchEvent) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              eventId: event.id,
              url: event.url1,
              title: event.name,
              leagueName: event.leagueName,
              isLive: event.isLive,
              isActive: true,
            }
          : s,
      ),
    );
    setShowEventPicker(null);
    setSearchQuery("");
  };

  const handleRemove = (slotId: number) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, eventId: null, url: "", title: "", isActive: false, leagueName: undefined, isLive: undefined }
          : s,
      ),
    );
  };

  const fmt = (url: string) => {
    if (!url) return "";
    if (!url.startsWith("http")) url = "https://" + url;
    return url + (url.includes("?") ? "&" : "?") + "autoplay=1&muted=0";
  };

  const activeCount = slots.filter((s) => s.isActive).length;
  const displaySlots = layout === 2 ? slots.slice(0, 2) : slots;

  return (
    <div className={cn("min-h-screen", isFullscreen && "fixed inset-0 z-50 bg-background p-3")}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent border border-primary/20 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-primary" />
            </div>
            {activeCount > 0 && (
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-background" />
            )}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Multi Stream</h1>
            <p className="text-[11px] text-muted-foreground/50">
              {activeCount > 0
                ? `${activeCount} de ${layout} activos`
                : loading
                  ? "Cargando partidos..."
                  : `${events.length} partidos disponibles`}
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
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  layout === n
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
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
            className="h-9 w-9 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center text-muted-foreground/50 hover:text-foreground transition-all"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── SLOTS GRID ── */}
      <div
        style={{
          display: layout === 2 ? "flex" : "grid",
          gridTemplateColumns: layout === 4 ? "1fr 1fr" : undefined,
          justifyContent: layout === 2 ? "center" : undefined,
          gap: "12px",
        }}
      >
        {displaySlots.map((slot, i) => (
          <div
            key={slot.id}
            style={layout === 2 ? { width: "calc(50% - 6px)", flexShrink: 0 } : {}}
            className={cn(
              "relative rounded-2xl overflow-hidden group",
              "aspect-video",
              slot.isActive
                ? "border border-white/[0.08] bg-card shadow-xl"
                : "border border-dashed border-white/[0.06] bg-white/[0.01] hover:border-primary/20",
            )}
          >
            {slot.isActive ? (
              <>
                <iframe
                  src={fmt(slot.url)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="absolute inset-x-0 top-0 p-2.5 bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="flex items-center gap-2">
                    {slot.isLive && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary">
                        <Radio className="w-2.5 h-2.5 text-white animate-pulse" />
                        <span className="text-[9px] font-bold text-white uppercase">Live</span>
                      </div>
                    )}
                    <span className="text-[11px] font-semibold text-white truncate">{slot.title}</span>
                  </div>
                </div>
                <div className="absolute bottom-2 left-2 w-6 h-6 rounded-lg bg-black/50 border border-white/10 flex items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-bold text-white/50">{slot.id}</span>
                </div>
                <button
                  onClick={() => handleRemove(slot.id)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/50 hover:bg-red-600 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all z-10 opacity-0 group-hover:opacity-100"
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
                    className="absolute inset-0 flex flex-col p-3 bg-card"
                  >
                    <div className="flex gap-2 mb-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Buscar partido..."
                          className="pl-9 h-9 bg-white/[0.02] border-white/[0.06] text-sm rounded-xl"
                          autoFocus
                        />
                      </div>
                      <button
                        onClick={loadEvents}
                        className="h-9 w-9 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-muted-foreground/40 hover:text-foreground shrink-0"
                      >
                        <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide min-h-0">
                      {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground/30">
                          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <span className="text-[11px]">Cargando...</span>
                        </div>
                      ) : filteredEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-1.5 text-muted-foreground/30">
                          <Trophy className="w-5 h-5" />
                          <span className="text-[11px]">No hay partidos con enlace</span>
                        </div>
                      ) : (
                        filteredEvents.map((event) => (
                          <button
                            key={event.id}
                            onClick={() => handleSelectEvent(slot.id, event)}
                            className="w-full p-2 rounded-xl bg-white/[0.02] hover:bg-primary/[0.06] border border-white/[0.04] hover:border-primary/20 transition-all text-left"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                                <Play className="w-3 h-3 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <span className="text-[12px] font-semibold text-foreground truncate">
                                    {event.name}
                                  </span>
                                  {event.isLive && (
                                    <span className="px-1 py-0.5 rounded bg-primary/20 text-[8px] font-bold text-primary uppercase shrink-0">
                                      Live
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-primary/50">{event.leagueName}</span>
                              </div>
                              <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setShowEventPicker(null);
                        setSearchQuery("");
                      }}
                      className="mt-2 w-full py-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-muted-foreground/50 text-xs hover:bg-white/[0.05] transition-all"
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
                    <div className="w-14 h-14 rounded-2xl bg-primary/[0.05] border border-dashed border-primary/15 flex items-center justify-center group-hover/add:border-primary/30 transition-all">
                      <Plus className="w-6 h-6 text-muted-foreground/25 group-hover/add:text-primary transition-colors" />
                    </div>
                    <div className="text-center">
                      <span className="block text-xs font-medium text-muted-foreground/30 group-hover/add:text-foreground/60 transition-colors">
                        Añadir Stream
                      </span>
                      <span className="block text-[10px] text-muted-foreground/20 mt-0.5">
                        {loading ? "Cargando..." : `${Math.max(0, events.length - selectedEventIds.size)} disponibles`}
                      </span>
                    </div>
                  </motion.button>
                )}
              </AnimatePresence>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
