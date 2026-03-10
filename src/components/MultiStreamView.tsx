import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Plus, X, Maximize2, Minimize2, Grid2X2, LayoutGrid, Search, Trophy, Play, Monitor, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface StreamSlot {
  id: number;
  eventId: string | null;
  title: string;
  url: string;
  isActive: boolean;
  league?: string;
  isLive?: boolean;
}

interface AvailableEvent {
  id: string;
  name: string;
  stream_url: string | null;
  stream_url_2: string | null;
  stream_url_3: string | null;
  team_home: string | null;
  team_away: string | null;
  league: string | null;
  is_live: boolean;
  event_date: string;
}

interface ExternalStream {
  id: string;
  name: string;
  category: string;
  iframe: string;
  poster?: string;
  viewers?: number;
  source: "ppv" | "streamed" | "moviebite";
  channels?: string;
}

const normalizeText = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function findBestExternalMatches(streams: ExternalStream[], homeName: string, awayName: string): ExternalStream[] {
  const scored: { stream: ExternalStream; score: number }[] = [];
  for (const s of streams) {
    const sName = normalizeText(s.name);
    const homeMatch = homeName.length > 2 && sName.includes(homeName);
    const awayMatch = awayName.length > 2 && sName.includes(awayName);
    const score = (homeMatch ? 1 : 0) + (awayMatch ? 1 : 0);
    if (score >= 1) scored.push({ stream: s, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map(s => s.stream);
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
  const [availableEvents, setAvailableEvents] = useState<AvailableEvent[]>([]);
  const [externalStreams, setExternalStreams] = useState<ExternalStream[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fetchInFlightRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);

  const fetchEvents = useCallback(async (background = false) => {
    if (fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;
    const shouldBlock = !background && !hasLoadedOnceRef.current;
    if (shouldBlock) setLoading(true);
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id,name,stream_url,stream_url_2,stream_url_3,team_home,team_away,league,is_live,event_date,is_active")
        .eq("is_active", true)
        .order("event_date", { ascending: true });
      if (!error && data) { setAvailableEvents(data as unknown as AvailableEvent[]); hasLoadedOnceRef.current = true; }
    } catch (e) { console.error(e); }
    finally { if (shouldBlock) setLoading(false); fetchInFlightRef.current = false; }
  }, []);

  const fetchExternalStreams = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("fetch-all-streams", { body: {} });
      if (!error && data?.streams) setExternalStreams(data.streams as ExternalStream[]);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    fetchExternalStreams();
    fetchEvents(false);
    const channel = supabase
      .channel("events-multistream")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => fetchEvents(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchEvents, fetchExternalStreams]);

  const displaySlots = layout === 2 ? slots.slice(0, 2) : slots;
  const activeSlots = slots.filter((s) => s.isActive);
  const selectedEventIds = useMemo(() => new Set(slots.map((s) => s.eventId).filter(Boolean) as string[]), [slots]);

  const effectiveEvents = useMemo<AvailableEvent[]>(() => {
    const externalAsEvents = externalStreams.slice(0, 120).map((stream, idx) => ({
      id: `ext-${stream.source}-${stream.id || idx}`,
      name: stream.name,
      stream_url: stream.iframe,
      stream_url_2: null,
      stream_url_3: null,
      team_home: null,
      team_away: null,
      league: stream.category || stream.source.toUpperCase(),
      is_live: true,
      event_date: new Date().toISOString(),
    }));
    return [...availableEvents, ...externalAsEvents];
  }, [availableEvents, externalStreams]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return effectiveEvents.filter((event) => {
      if (!event.stream_url) return false;
      if (selectedEventIds.has(event.id)) return false;
      if (!q) return true;
      const hay = `${event.name} ${event.team_home ?? ""} ${event.team_away ?? ""} ${event.league ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [effectiveEvents, searchQuery, selectedEventIds]);

  const handleSelectEvent = (slotId: number, event: AvailableEvent) => {
    if (!event.stream_url) { toast.info("No hay stream disponible"); return; }
    setSlots((prev) => prev.map((slot) =>
      slot.id === slotId
        ? { ...slot, eventId: event.id, url: event.stream_url!, title: event.name, league: event.league || undefined, isLive: event.is_live, isActive: true }
        : slot,
    ));
    setShowEventPicker(null);
    setSearchQuery("");
  };

  const handleRemoveStream = (slotId: number) => {
    setSlots(prev => prev.map(slot =>
      slot.id === slotId ? { ...slot, eventId: null, url: "", title: "", isActive: false, league: undefined, isLive: undefined } : slot
    ));
  };

  const formatStreamUrl = (url: string) => {
    if (!url) return "";
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}autoplay=1&auto_play=true&muted=0`;
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  };

  return (
    <div ref={containerRef} className={cn("min-h-screen", isFullscreen && "fixed inset-0 z-50 bg-[#0a0a0a] p-3")}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
            <Monitor className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">Multi Stream</h1>
            <p className="text-[10px] text-muted-foreground/40">
              {activeSlots.length > 0 ? `${activeSlots.length}/${layout} activos` : "Selecciona partidos"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            {([2, 4] as const).map((n) => (
              <button
                key={n}
                onClick={() => setLayout(n)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200",
                  layout === n
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground/40 hover:text-foreground"
                )}
              >
                {n === 2 ? <Grid2X2 className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
                {n}
              </button>
            ))}
          </div>
          <button
            onClick={toggleFullscreen}
            className="h-8 w-8 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-center text-muted-foreground/40 hover:text-foreground transition-all"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </motion.div>

      {/* Grid - proper 2x2 or 1x2 */}
      <div className={cn(
        "grid gap-2",
        layout === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-2",
        isFullscreen && "h-[calc(100vh-64px)]"
      )}>
        {displaySlots.map((slot, index) => (
          <motion.div
            key={slot.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "relative rounded-lg overflow-hidden group",
              slot.isActive
                ? "border border-white/[0.06] bg-[#0a0a0a]"
                : "border border-dashed border-white/[0.05] bg-[#050505] hover:border-primary/15",
              "aspect-video"
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
                {/* Overlay info */}
                <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <div className="flex items-center gap-1.5">
                    {slot.isLive && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-destructive">
                        <Radio className="w-2 h-2 text-white animate-pulse" />
                        <span className="text-[8px] font-bold text-white tracking-wider">LIVE</span>
                      </div>
                    )}
                    <span className="text-[10px] font-medium text-white/80 truncate">{slot.title}</span>
                  </div>
                </div>
                {/* Slot number */}
                <div className="absolute bottom-1.5 left-1.5 w-5 h-5 rounded bg-black/60 flex items-center justify-center pointer-events-none">
                  <span className="text-[9px] font-bold text-white/40">{slot.id}</span>
                </div>
                {/* Remove */}
                <button
                  onClick={() => handleRemoveStream(slot.id)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded bg-black/60 hover:bg-destructive flex items-center justify-center text-white/40 hover:text-white transition-all z-10 opacity-0 group-hover:opacity-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            ) : (
              <AnimatePresence mode="wait">
                {showEventPicker === slot.id ? (
                  <motion.div key="picker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col p-2.5 bg-[#0a0a0a] overflow-hidden">
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/30" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar..."
                        className="pl-8 h-8 bg-white/[0.03] border-white/[0.06] text-xs rounded-lg"
                        autoFocus
                      />
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 scrollbar-hide">
                      {loading ? (
                        <div className="flex items-center justify-center h-16">
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : filteredEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-16 text-muted-foreground/30">
                          <Trophy className="w-4 h-4 mb-1" />
                          <span className="text-[10px]">Sin partidos</span>
                        </div>
                      ) : (
                        filteredEvents.map((event) => (
                          <button
                            key={event.id}
                            onClick={() => handleSelectEvent(slot.id, event)}
                            className="w-full p-2 rounded-lg bg-white/[0.02] hover:bg-primary/[0.06] border border-white/[0.03] hover:border-primary/20 transition-all text-left"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/10 flex items-center justify-center shrink-0">
                                <Play className="w-3 h-3 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[11px] font-semibold text-foreground truncate block">{event.name}</span>
                                <span className="text-[9px] text-muted-foreground/30">{event.league || "Sports"}</span>
                              </div>
                              {event.is_live && (
                                <span className="px-1.5 py-0.5 rounded bg-destructive/20 text-[8px] font-bold text-destructive shrink-0">LIVE</span>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    <button
                      onClick={() => { setShowEventPicker(null); setSearchQuery(""); }}
                      className="mt-1.5 w-full py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-muted-foreground/40 text-[10px] font-medium hover:bg-white/[0.04] transition-all"
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
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                  >
                    <div className="absolute top-2 left-2 w-5 h-5 rounded bg-white/[0.03] flex items-center justify-center">
                      <span className="text-[9px] font-bold text-muted-foreground/15">{slot.id}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-dashed border-white/[0.08] flex items-center justify-center hover:border-primary/20 transition-all">
                      <Plus className="w-5 h-5 text-muted-foreground/20" />
                    </div>
                    <span className="text-[10px] text-muted-foreground/20">Añadir</span>
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
