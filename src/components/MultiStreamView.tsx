import { useState, useEffect } from "react";
import { Plus, X, Maximize2, Minimize2, Grid2X2, LayoutGrid, Tv, Search, Trophy, Radio, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

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
    <div className={cn("min-h-screen p-4 md:p-6", isFullscreen && "fixed inset-0 z-50 bg-black")}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30 flex items-center justify-center">
            <Tv className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-white">Multi Stream</h1>
            <p className="text-[11px] text-white/40">Ve múltiples partidos simultáneamente</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 p-1 rounded-xl bg-white/5 border border-white/10">
            <button onClick={() => setLayout(2)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all", layout === 2 ? "bg-red-600 text-white" : "text-white/50 hover:text-white hover:bg-white/5")}>
              <Grid2X2 className="w-3.5 h-3.5" /> 2
            </button>
            <button onClick={() => setLayout(4)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all", layout === 4 ? "bg-red-600 text-white" : "text-white/50 hover:text-white hover:bg-white/5")}>
              <LayoutGrid className="w-3.5 h-3.5" /> 4
            </button>
          </div>
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all">
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className={cn("grid gap-3", layout === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2", isFullscreen && "h-[calc(100vh-80px)]")}>
        {displaySlots.map((slot) => (
          <div
            key={slot.id}
            className={cn(
              "relative rounded-2xl overflow-hidden border transition-all duration-300",
              slot.isActive
                ? "border-white/15 bg-black shadow-lg shadow-black/50"
                : "border-white/[0.08] border-dashed bg-[#0d1117] hover:bg-white/[0.03] hover:border-white/15",
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

                {/* Title overlay */}
                <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                  <div className="flex items-center gap-2">
                    {slot.isLive && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/80">
                        <Radio className="w-2.5 h-2.5 text-white" />
                        <span className="text-[8px] font-bold text-white uppercase">Live</span>
                      </div>
                    )}
                    <span className="text-[11px] font-bold text-white truncate">{slot.title}</span>
                    {slot.league && (
                      <span className="text-[9px] text-white/40 truncate hidden sm:block">• {slot.league}</span>
                    )}
                  </div>
                </div>

                <button onClick={() => handleRemoveStream(slot.id)} className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 hover:bg-red-500/80 border border-white/15 flex items-center justify-center text-white transition-all z-10">
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                {showEventPicker === slot.id ? (
                  <div className="absolute inset-0 flex flex-col p-3 bg-[#0d1117] overflow-hidden">
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar partido..." className="pl-10 h-9 bg-white/5 border-white/10 text-sm" autoFocus />
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                      {loading ? (
                        <div className="flex items-center justify-center h-20"><div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /></div>
                      ) : filteredEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-20 text-white/30"><Trophy className="w-5 h-5 mb-1" /><span className="text-[11px]">No hay partidos</span></div>
                      ) : (
                        filteredEvents.map((event) => (
                          <button key={event.id} onClick={() => handleSelectEvent(slot.id, event)} className="w-full p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-red-500/30 transition-all text-left group">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500/15 to-red-600/5 border border-red-500/15 flex items-center justify-center shrink-0">
                                <Play className="w-3.5 h-3.5 text-red-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[12px] font-bold text-white truncate">{event.name}</span>
                                  {event.is_live && (<span className="px-1 py-0.5 rounded bg-red-500/20 text-[8px] font-bold text-red-400 uppercase shrink-0">Live</span>)}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                                  {event.league && <span>{event.league}</span>}
                                  <span>•</span>
                                  <span>{new Date(event.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </div>
                              <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    <button onClick={() => { setShowEventPicker(null); setSearchQuery(""); }} className="mt-2 w-full py-2 rounded-xl bg-white/5 text-white/50 text-xs font-medium hover:bg-white/10 transition-all">Cancelar</button>
                  </div>
                ) : (
                  <button onClick={() => setShowEventPicker(slot.id)} className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 group">
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center group-hover:bg-white/[0.08] group-hover:border-red-500/20 transition-all">
                      <Plus className="w-7 h-7 text-white/30 group-hover:text-red-400 transition-colors" />
                    </div>
                    <span className="text-xs font-medium text-white/30 group-hover:text-white/50 transition-colors">Añadir Partido</span>
                    <span className="text-[10px] text-white/15">{availableEvents.length - selectedEventIds.filter(Boolean).length} disponibles</span>
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Counter */}
      <div className="mt-4 flex items-center justify-center">
        <div className="px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-[11px] text-white/40">
          {activeSlots.length} de {layout} activos
        </div>
      </div>
    </div>
  );
}
