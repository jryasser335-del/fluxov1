import { useState, useEffect } from "react";
import { Plus, X, Maximize2, Minimize2, Grid2X2, LayoutGrid, Search, Trophy, Play, Monitor, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

interface StreamSlot {
  id: number;
  eventId: string | null;
  title: string;
  url: string;
  isActive: boolean;
  teamHome?: string;
  teamAway?: string;
  league?: string;
  isLive?: boolean;
}

interface AvailableEvent {
  id: string;
  name: string;
  stream_url: string;
  stream_url_2: string | null;
  stream_url_3: string | null;
  team_home: string | null;
  team_away: string | null;
  league: string | null;
  is_live: boolean;
  event_date: string;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("is_active", true)
        .order("event_date", { ascending: true });
      if (!error && data) setAvailableEvents(data as AvailableEvent[]);
      setLoading(false);
    };
    fetchEvents();
    const channel = supabase
      .channel("events-multistream")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => fetchEvents())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const activeSlots = slots.filter(s => s.isActive);
  const displaySlots = layout === 2 ? slots.slice(0, 2) : slots;
  const selectedEventIds = slots.filter(s => s.eventId).map(s => s.eventId);

  const filteredEvents = availableEvents.filter(event => {
    const hasStream = !!(event.stream_url || event.stream_url_2 || event.stream_url_3);
    const matchesSearch = searchQuery === "" || 
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.team_home?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.team_away?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.league?.toLowerCase().includes(searchQuery.toLowerCase());
    return hasStream && matchesSearch && !selectedEventIds.includes(event.id);
  });

  const handleSelectEvent = (slotId: number, event: AvailableEvent) => {
    const streamUrl = event.stream_url || event.stream_url_2 || event.stream_url_3;
    if (!streamUrl) return;

    setSlots(prev => prev.map(slot => 
      slot.id === slotId 
        ? { ...slot, eventId: event.id, url: streamUrl, title: event.name, teamHome: event.team_home || undefined, teamAway: event.team_away || undefined, league: event.league || undefined, isLive: event.is_live, isActive: true }
        : slot
    ));
    setShowEventPicker(null);
    setSearchQuery("");
  };

  const handleRemoveStream = (slotId: number) => {
    setSlots(prev => prev.map(slot => 
      slot.id === slotId ? { ...slot, eventId: null, url: "", title: "", isActive: false, teamHome: undefined, teamAway: undefined, league: undefined, isLive: undefined } : slot
    ));
  };

  const formatStreamUrl = (url: string) => {
    if (!url) return "";
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}autoplay=1&auto_play=true&muted=0`;
  };

  return (
    <div className={cn("min-h-screen", isFullscreen && "fixed inset-0 z-50 bg-background p-3")}>
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-5"
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
                : "Añade partidos para ver en simultáneo"
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Layout toggle */}
          <div className="flex items-center p-1 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            {([2, 4] as const).map((n) => (
              <button
                key={n}
                onClick={() => setLayout(n)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300",
                  layout === n
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.04]"
                )}
              >
                {n === 2 ? <Grid2X2 className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
                {n}
              </button>
            ))}
          </div>

          {/* Fullscreen */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-9 w-9 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.06] transition-all duration-300"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </motion.div>

      {/* Grid */}
      <div className={cn(
        "grid gap-3",
        layout === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2",
        isFullscreen && "h-[calc(100vh-80px)]"
      )}>
        {displaySlots.map((slot, index) => (
          <motion.div
            key={slot.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.06, duration: 0.3 }}
            className={cn(
              "relative rounded-2xl overflow-hidden transition-all duration-300 group",
              slot.isActive
                ? "border border-white/[0.08] bg-card shadow-xl"
                : "border border-dashed border-white/[0.06] bg-gradient-to-br from-white/[0.01] to-transparent hover:border-primary/20 hover:from-primary/[0.02]",
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

                {/* Top overlay */}
                <div className="absolute top-0 left-0 right-0 p-2.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="flex items-center gap-2">
                    {slot.isLive && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary shadow-lg shadow-primary/20">
                        <Radio className="w-2.5 h-2.5 text-primary-foreground animate-pulse" />
                        <span className="text-[9px] font-bold text-primary-foreground uppercase tracking-wider">En Vivo</span>
                      </div>
                    )}
                    <span className="text-[11px] font-semibold text-white truncate">{slot.title}</span>
                    {slot.league && (
                      <span className="text-[9px] text-white/40 truncate hidden sm:block px-1.5 py-0.5 rounded bg-white/10">
                        {slot.league}
                      </span>
                    )}
                  </div>
                </div>

                {/* Slot number indicator */}
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
                      {loading ? (
                        <div className="flex items-center justify-center h-20">
                          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : filteredEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-20 text-muted-foreground/30">
                          <Trophy className="w-5 h-5 mb-1.5" />
                          <span className="text-[11px] font-medium">No hay partidos disponibles</span>
                        </div>
                      ) : (
                        filteredEvents.map((event) => (
                          <button
                            key={event.id}
                            onClick={() => handleSelectEvent(slot.id, event)}
                            className="w-full p-2.5 rounded-xl bg-white/[0.02] hover:bg-primary/[0.05] border border-white/[0.04] hover:border-primary/20 transition-all text-left group/item"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center shrink-0 group-hover/item:border-primary/25 transition-colors">
                                <Play className="w-3.5 h-3.5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[12px] font-semibold text-foreground truncate">{event.name}</span>
                                  {event.is_live && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-primary/15 border border-primary/20 text-[8px] font-bold text-primary uppercase shrink-0">
                                      Live
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40 mt-0.5">
                                  {event.league && <span className="text-primary/60">{event.league}</span>}
                                  {event.league && <span>•</span>}
                                  <span>{new Date(event.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </div>
                              <div className="w-2 h-2 rounded-full bg-success/80 shrink-0" />
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    <button
                      onClick={() => { setShowEventPicker(null); setSearchQuery(""); }}
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
                    {/* Slot number */}
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
                        {availableEvents.length - selectedEventIds.filter(Boolean).length} disponibles
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
