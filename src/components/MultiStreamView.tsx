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
import { fetchESPNScoreboard } from "@/lib/api";

// ── Leagues to fetch (same as EventsView) ────────────────────────────────────
const ALL_LEAGUES: { key: string; name: string; sport: string }[] = [
  { key: "eng.1", name: "Premier League", sport: "Football" },
  { key: "esp.1", name: "LaLiga", sport: "Football" },
  { key: "ger.1", name: "Bundesliga", sport: "Football" },
  { key: "ita.1", name: "Serie A", sport: "Football" },
  { key: "fra.1", name: "Ligue 1", sport: "Football" },
  { key: "uefa.champions", name: "Champions League", sport: "Football" },
  { key: "uefa.europa", name: "Europa League", sport: "Football" },
  { key: "esp.copa_del_rey", name: "Copa del Rey", sport: "Football" },
  { key: "eng.fa", name: "FA Cup", sport: "Football" },
  { key: "eng.league_cup", name: "EFL Cup", sport: "Football" },
  { key: "ger.dfb_pokal", name: "DFB Pokal", sport: "Football" },
  { key: "ita.coppa_italia", name: "Coppa Italia", sport: "Football" },
  { key: "fra.coupe_de_france", name: "Coupe de France", sport: "Football" },
  { key: "ned.1", name: "Eredivisie", sport: "Football" },
  { key: "por.1", name: "Primeira Liga", sport: "Football" },
  { key: "tur.1", name: "Süper Lig", sport: "Football" },
  { key: "mex.1", name: "Liga MX", sport: "Football" },
  { key: "arg.1", name: "Primera División", sport: "Football" },
  { key: "bra.1", name: "Brasileirão", sport: "Football" },
  { key: "conmebol.libertadores", name: "Libertadores", sport: "Football" },
  { key: "mls", name: "MLS", sport: "Football" },
  { key: "nba", name: "NBA", sport: "NBA" },
  { key: "mlb", name: "MLB", sport: "MLB" },
  { key: "nhl", name: "NHL", sport: "NHL" },
  { key: "boxing", name: "Boxing", sport: "Boxing" },
  { key: "ufc", name: "UFC / MMA", sport: "MMA" },
  { key: "wwe", name: "WWE", sport: "WWE" },
];

interface MatchEvent {
  id: string;
  name: string;
  url1: string;
  url2?: string;
  url3?: string;
  teamHome: string;
  teamAway: string;
  leagueName: string;
  sport: string;
  isLive: boolean;
  state: "in" | "pre" | "post";
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

const normalizeText = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

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
  const [loaded, setLoaded] = useState(false);

  // ── Load events from ESPN + Supabase ────────────────────────────────────────
  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch ESPN events for all leagues in parallel
      const results = await Promise.allSettled(
        ALL_LEAGUES.map(async (lg) => {
          const data = await fetchESPNScoreboard(lg.key);
          return (data.events || []).map((event) => {
            const comp = event.competitions?.[0];
            const competitors = comp?.competitors || [];
            const home = competitors.find((c) => c.homeAway === "home");
            const away = competitors.find((c) => c.homeAway === "away");
            return {
              espnId: event.id,
              name: `${away?.team?.displayName ?? "TBD"} vs ${home?.team?.displayName ?? "TBD"}`,
              teamHome: home?.team?.displayName ?? "",
              teamAway: away?.team?.displayName ?? "",
              leagueName: lg.name,
              sport: lg.sport,
              isLive: comp?.status?.type?.state === "in",
              state: (comp?.status?.type?.state ?? "pre") as "in" | "pre" | "post",
            };
          });
        }),
      );

      type EspnItem = {
        espnId: string;
        name: string;
        teamHome: string;
        teamAway: string;
        leagueName: string;
        sport: string;
        isLive: boolean;
        state: "in" | "pre" | "post";
      };
      const espnEvents: EspnItem[] = [];
      const seen = new Set<string>();
      for (const r of results) {
        if (r.status === "fulfilled") {
          for (const e of r.value) {
            if (!seen.has(e.espnId)) {
              seen.add(e.espnId);
              espnEvents.push(e);
            }
          }
        }
      }

      // 2. Fetch DB stream links
      const { data: dbEvents } = await supabase
        .from("events")
        .select("espn_id,name,team_home,team_away,stream_url,stream_url_2,stream_url_3,is_active")
        .eq("is_active", true);

      const dbMap = new Map<string, { url1: string; url2?: string; url3?: string }>();
      for (const d of dbEvents ?? []) {
        if (d.stream_url) {
          if (d.espn_id) {
            dbMap.set(d.espn_id, {
              url1: d.stream_url,
              url2: d.stream_url_2 ?? undefined,
              url3: d.stream_url_3 ?? undefined,
            });
          }
          // also index by team names for fuzzy match
          const key = normalizeText(`${d.team_home ?? ""} ${d.team_away ?? ""}`);
          if (key.trim())
            dbMap.set(key, {
              url1: d.stream_url,
              url2: d.stream_url_2 ?? undefined,
              url3: d.stream_url_3 ?? undefined,
            });
        }
      }

      // 3. Match links to ESPN events
      const matched: MatchEvent[] = espnEvents.map((e) => {
        let link = dbMap.get(e.espnId);
        if (!link) {
          const key = normalizeText(`${e.teamHome} ${e.teamAway}`);
          link = dbMap.get(key);
        }
        if (!link) {
          // try reverse order
          const keyRev = normalizeText(`${e.teamAway} ${e.teamHome}`);
          link = dbMap.get(keyRev);
        }
        return {
          id: e.espnId,
          name: e.name,
          url1: link?.url1 ?? "",
          url2: link?.url2,
          url3: link?.url3,
          teamHome: e.teamHome,
          teamAway: e.teamAway,
          leagueName: e.leagueName,
          sport: e.sport,
          isLive: e.isLive,
          state: e.state,
        };
      });

      // Sort: live first, then with link, then upcoming
      matched.sort((a, b) => {
        if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
        if (!!a.url1 !== !!b.url1) return a.url1 ? -1 : 1;
        return 0;
      });

      setEvents(matched);
      setLoaded(true);
    } catch (e) {
      console.error(e);
      toast.error("Error al cargar partidos");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load when picker opens for the first time
  useEffect(() => {
    if (showEventPicker !== null && !loaded && !loading) {
      loadEvents();
    }
  }, [showEventPicker, loaded, loading, loadEvents]);

  const selectedEventIds = useMemo(() => new Set(slots.map((s) => s.eventId).filter(Boolean) as string[]), [slots]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((event) => {
      if (selectedEventIds.has(event.id)) return false;
      if (!q) return true;
      const hay = `${event.name} ${event.teamHome} ${event.teamAway} ${event.leagueName}`.toLowerCase();
      return hay.includes(q);
    });
  }, [events, searchQuery, selectedEventIds]);

  const eventsWithLink = useMemo(
    () => events.filter((e) => !!e.url1 && !selectedEventIds.has(e.id)),
    [events, selectedEventIds],
  );

  const handleSelectEvent = (slotId: number, event: MatchEvent) => {
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
          ? { ...slot, eventId: null, url: "", title: "", isActive: false, leagueName: undefined, isLive: undefined }
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

      {/* Grid — centered when layout=2 */}
      <div
        className={cn("relative z-10", isFullscreen && "h-[calc(100vh-80px)]")}
        style={
          layout === 2
            ? { display: "flex", justifyContent: "center", alignItems: "flex-start", gap: "12px" }
            : { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }
        }
      >
        {displaySlots.map((slot, index) => (
          <motion.div
            key={slot.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.06, duration: 0.3 }}
            style={layout === 2 ? { width: "calc(50% - 6px)", flexShrink: 0 } : {}}
            className={cn(
              "relative rounded-2xl overflow-hidden transition-all duration-300 group aspect-video",
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
                    {/* Search + refresh */}
                    <div className="flex gap-2 mb-2.5">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Buscar partido..."
                          className="pl-10 h-9 bg-white/[0.02] border-white/[0.06] focus:border-primary/30 text-sm rounded-xl"
                          autoFocus
                        />
                      </div>
                      <button
                        onClick={() => loadEvents()}
                        className="h-9 w-9 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-muted-foreground/40 hover:text-foreground transition-all shrink-0"
                      >
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-hide">
                      {loading ? (
                        <div className="flex flex-col items-center justify-center h-24 gap-2 text-muted-foreground/30">
                          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <span className="text-[11px]">Cargando partidos...</span>
                        </div>
                      ) : filteredEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-20 text-muted-foreground/30">
                          <Trophy className="w-5 h-5 mb-1.5" />
                          <span className="text-[11px] font-medium">No hay partidos hoy</span>
                        </div>
                      ) : (
                        filteredEvents.map((event) => {
                          const hasLink = !!event.url1;
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
                                    "w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 transition-colors",
                                    hasLink
                                      ? "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/10 group-hover/item:border-primary/25"
                                      : "bg-white/[0.03] border-white/[0.05]",
                                  )}
                                >
                                  <Play
                                    className={cn("w-3.5 h-3.5", hasLink ? "text-primary" : "text-muted-foreground/20")}
                                  />
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
                                        <span className="text-muted-foreground/30">Sin enlace</span>
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
                        {loaded
                          ? eventsWithLink.length > 0
                            ? `${eventsWithLink.length} disponibles`
                            : "Sin enlaces hoy"
                          : "Toca para cargar"}
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
