import { useState, useEffect } from "react";
import { Plus, X, Maximize2, Minimize2, Grid2X2, LayoutGrid, Tv, Search, Trophy, Radio, Play, Zap, Monitor } from "lucide-react";
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
        .not("stream_url", "is", null)
        .neq("stream_url", "")
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
    const matchesSearch = searchQuery === "" || 
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.team_home?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.team_away?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.league?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && !selectedEventIds.includes(event.id);
  });

  const handleSelectEvent = (slotId: number, event: AvailableEvent) => {
    setSlots(prev => prev.map(slot => 
      slot.id === slotId 
        ? { ...slot, eventId: event.id, url: event.stream_url, title: event.name, teamHome: event.team_home || undefined, teamAway: event.team_away || undefined, league: event.league || undefined, isLive: event.is_live, isActive: true }
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
    <div className={cn("min-h-screen", isFullscreen && "fixed inset-0 z-50 bg-black p-3")}>
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-4"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-purple-500/10 border border-cyan-500/20 flex items-center justify-center backdrop-blur-sm">
              <Monitor className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-cyan-400 border-2 border-background animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-display font-black text-white tracking-tight">Multi Stream</h1>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-cyan-400" />
              <p className="text-[11px] text-white/40 font-medium">Múltiples partidos en simultáneo</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Layout toggle */}
          <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm">
            {([2, 4] as const).map((n) => (
              <button
                key={n}
                onClick={() => setLayout(n)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300",
                  layout === n
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.06]"
                )}
              >
                {n === 2 ? <Grid2X2 className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
                {n}
              </button>
            ))}
          </div>

          {/* Active counter pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] text-white/50">
            <div className={cn("w-2 h-2 rounded-full", activeSlots.length > 0 ? "bg-emerald-400 animate-pulse" : "bg-white/20")} />
            <span className="font-semibold">{activeSlots.length}/{layout}</span>
          </div>

          {/* Fullscreen */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-9 w-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] hover:border-cyan-500/20 transition-all duration-300"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </motion.div>

      {/* Grid */}
      <div className={cn(
        "grid gap-2.5",
        layout === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2",
        isFullscreen && "h-[calc(100vh-80px)]"
      )}>
        {displaySlots.map((slot, index) => (
          <motion.div
            key={slot.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.08, duration: 0.3 }}
            className={cn(
              "relative rounded-2xl overflow-hidden transition-all duration-300 group",
              slot.isActive
                ? "border border-white/[0.1] bg-black ring-1 ring-cyan-500/10 shadow-xl shadow-black/40"
                : "border border-dashed border-white/[0.08] bg-gradient-to-br from-white/[0.02] to-transparent hover:border-cyan-500/20 hover:from-cyan-500/[0.03]",
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
                <div className="absolute top-0 left-0 right-0 p-2.5 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="flex items-center gap-2">
                    {slot.isLive && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500 shadow-lg shadow-red-500/30">
                        <Radio className="w-2.5 h-2.5 text-white animate-pulse" />
                        <span className="text-[9px] font-black text-white uppercase tracking-wider">En Vivo</span>
                      </div>
                    )}
                    <span className="text-[11px] font-bold text-white truncate">{slot.title}</span>
                    {slot.league && (
                      <span className="text-[9px] text-white/50 truncate hidden sm:block px-1.5 py-0.5 rounded bg-white/10">
                        {slot.league}
                      </span>
                    )}
                  </div>
                </div>

                {/* Slot number indicator */}
                <div className="absolute bottom-2 left-2 w-6 h-6 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-black text-white/60">{slot.id}</span>
                </div>

                <button
                  onClick={() => handleRemoveStream(slot.id)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/70 hover:bg-red-500 border border-white/10 hover:border-red-400 flex items-center justify-center text-white/60 hover:text-white transition-all z-10 opacity-0 group-hover:opacity-100"
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
                    className="absolute inset-0 flex flex-col p-3 bg-[#080c14] overflow-hidden"
                  >
                    <div className="relative mb-2.5">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/50" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar partido..."
                        className="pl-10 h-9 bg-white/[0.04] border-cyan-500/10 focus:border-cyan-500/30 text-sm rounded-xl"
                        autoFocus
                      />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                      {loading ? (
                        <div className="flex items-center justify-center h-20">
                          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : filteredEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-20 text-white/25">
                          <Trophy className="w-5 h-5 mb-1.5 text-white/15" />
                          <span className="text-[11px] font-medium">No hay partidos disponibles</span>
                        </div>
                      ) : (
                        filteredEvents.map((event) => (
                          <button
                            key={event.id}
                            onClick={() => handleSelectEvent(slot.id, event)}
                            className="w-full p-2.5 rounded-xl bg-white/[0.02] hover:bg-cyan-500/[0.06] border border-white/[0.05] hover:border-cyan-500/20 transition-all text-left group/item"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/10 flex items-center justify-center shrink-0 group-hover/item:border-cyan-500/25 transition-colors">
                                <Play className="w-3.5 h-3.5 text-cyan-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[12px] font-bold text-white truncate">{event.name}</span>
                                  {event.is_live && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-red-500/15 border border-red-500/20 text-[8px] font-black text-red-400 uppercase shrink-0">
                                      Live
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-white/30 mt-0.5">
                                  {event.league && <span className="text-cyan-400/50">{event.league}</span>}
                                  {event.league && <span>•</span>}
                                  <span>{new Date(event.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </div>
                              <div className="w-2 h-2 rounded-full bg-emerald-400/80 shrink-0 group-hover/item:shadow-lg group-hover/item:shadow-emerald-400/20 transition-shadow" />
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    <button
                      onClick={() => { setShowEventPicker(null); setSearchQuery(""); }}
                      className="mt-2 w-full py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/40 text-xs font-semibold hover:bg-white/[0.08] hover:text-white/60 transition-all"
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
                    <div className="absolute top-3 left-3 w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                      <span className="text-[10px] font-black text-white/20">{slot.id}</span>
                    </div>

                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/[0.06] to-blue-500/[0.03] border border-dashed border-cyan-500/15 flex items-center justify-center group-hover/add:border-cyan-500/30 group-hover/add:from-cyan-500/[0.1] transition-all duration-300">
                      <Plus className="w-7 h-7 text-white/20 group-hover/add:text-cyan-400 transition-colors duration-300" />
                    </div>
                    <div className="text-center">
                      <span className="block text-xs font-semibold text-white/25 group-hover/add:text-white/50 transition-colors">
                        Añadir Stream
                      </span>
                      <span className="block text-[10px] text-white/15 mt-0.5">
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
