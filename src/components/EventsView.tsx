import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { fetchESPNScoreboard, ESPNEvent } from "@/lib/api";
import { LEAGUE_OPTIONS } from "@/lib/constants";
import { usePlayerModal } from "@/hooks/usePlayerModal";
import { supabase } from "@/integrations/supabase/client";
import { ScheduleRow } from "./events/ScheduleRow";
import { Search, RefreshCw, Zap, Loader2, Calendar, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import fluxoLogo from "@/assets/fluxotv-logo.png";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

// ── Cache localStorage (5 min) ──
const CACHE_KEY = "fluxo_streams_cache";
const CACHE_TTL = 5 * 60 * 1000;

function readStreamCache(): ExternalStream[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { streams, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return streams as ExternalStream[];
  } catch { return null; }
}

function writeStreamCache(streams: ExternalStream[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ streams, ts: Date.now() })); } catch { /* full */ }
}

const SPORT_FILTERS = [
  { value: "all", label: "All", emoji: "📺" },
  { value: "live", label: "Live", emoji: "🔴" },
  { value: "football", label: "Football", emoji: "⚽" },
  { value: "basketball", label: "Basketball", emoji: "🏀" },
  { value: "baseball", label: "Baseball", emoji: "⚾" },
  { value: "hockey", label: "Hockey", emoji: "🏒" },
  { value: "fighting", label: "Fighting", emoji: "🥊" },
  { value: "tennis", label: "Tennis", emoji: "🎾" },
  { value: "motorsport", label: "Motorsport", emoji: "🏎️" },
];

const CATEGORY_ALIASES: Record<string, string[]> = {
  football: ["football", "soccer", "futbol", "fútbol"],
  basketball: ["basketball", "nba", "ncaa basketball"],
  baseball: ["baseball", "mlb", "wbc"],
  hockey: ["hockey", "nhl", "ice hockey"],
  fighting: ["boxing", "mma", "ufc", "wrestling", "wwe", "combat sports", "combat", "fight"],
  tennis: ["tennis", "atp", "wta"],
  motorsport: ["f1", "formula", "nascar", "motogp", "indycar", "racing", "motorsport"],
};

interface ExternalStream {
  id: string;
  name: string;
  category: string;
  iframe: string;
  poster?: string;
  viewers?: number;
  source: "ppv" | "streamed" | "moviebite";
  channels?: string;
  starts_at?: number;
  ends_at?: number;
}

interface DbEvent {
  espn_id: string | null;
  name: string;
  team_home: string | null;
  team_away: string | null;
  stream_url: string | null;
  stream_url_2: string | null;
  stream_url_3: string | null;
  pending_url: string | null;
  is_active: boolean;
  sport: string | null;
  league: string | null;
  is_live: boolean;
  event_date: string;
}

const normalizeText = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function categorizeStream(category: string): string {
  const cat = normalizeText(category);
  for (const [key, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.some((a) => cat.includes(a))) return key;
  }
  return category;
}

function parseTeams(name: string): { home?: string; away?: string } {
  // Try "X vs Y", "X - Y", "X at Y"
  for (const sep of [" vs ", " VS ", " Vs ", " - ", " at ", " @ "]) {
    const idx = name.indexOf(sep);
    if (idx > 0) {
      return { away: name.slice(0, idx).trim(), home: name.slice(idx + sep.length).trim() };
    }
  }
  return { away: name };
}

function formatStreamTime(startsAt?: number): string {
  if (!startsAt) return "";
  const d = new Date(startsAt * 1000);
  const now = Date.now();
  // If already started, it's live
  if (startsAt * 1000 <= now) return "";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function isStreamLive(stream: ExternalStream): boolean {
  const now = Date.now() / 1000;
  if (stream.starts_at && stream.ends_at) {
    return now >= stream.starts_at && now <= stream.ends_at;
  }
  // PPV streams without timestamps - check if has viewers or source indicates live
  if (stream.viewers && stream.viewers > 0) return true;
  return false;
}

interface GroupedCategory {
  name: string;
  displayName: string;
  streams: ExternalStream[];
  liveCount: number;
}

export function EventsView() {
  const { openPlayer } = usePlayerModal();
  const { openWithMessage } = usePlayerModal();

  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [externalStreams, setExternalStreams] = useState<ExternalStream[]>(() => readStreamCache() || []);
  const [streamsLoaded, setStreamsLoaded] = useState(() => readStreamCache() !== null);
  const [loading, setLoading] = useState(!readStreamCache());
  const [dbEvents, setDbEvents] = useState<DbEvent[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("fluxoFavEvents") || "[]")); }
    catch { return new Set(); }
  });

  // Fetch DB events
  const fetchEventLinks = useCallback(async () => {
    const { data, error } = await supabase
      .from("events")
      .select("espn_id,name,team_home,team_away,stream_url,stream_url_2,stream_url_3,pending_url,is_active,sport,league,is_live,event_date")
      .eq("is_active", true);
    if (!error && data) setDbEvents(data as DbEvent[]);
  }, []);

  // Fetch streams
  const fetchExternalStreams = useCallback(async (force = false) => {
    if (!force) {
      const cached = readStreamCache();
      if (cached) { setExternalStreams(cached); setStreamsLoaded(true); setLoading(false); return; }
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-all-streams", { body: {} });
      if (!error && data?.streams?.length > 0) {
        const streams = data.streams as ExternalStream[];
        setExternalStreams(streams);
        writeStreamCache(streams);
      }
    } catch (e) { console.error(e); }
    finally { setStreamsLoaded(true); setLoading(false); }
  }, []);

  useEffect(() => {
    fetchEventLinks();
    fetchExternalStreams();
    const ch = supabase.channel("events-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, fetchEventLinks)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchEventLinks, fetchExternalStreams]);

  // Auto-refresh
  useEffect(() => {
    const iv = setInterval(() => {
      fetchEventLinks();
      if (!readStreamCache()) fetchExternalStreams(true);
    }, 60000);
    return () => clearInterval(iv);
  }, [fetchEventLinks, fetchExternalStreams]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem("fluxoFavEvents", JSON.stringify([...next]));
      return next;
    });
  };

  // Group streams by category
  const groupedCategories = useMemo(() => {
    let streams = [...externalStreams];
    const q = normalizeText(searchQuery);

    // Search filter
    if (q) {
      streams = streams.filter((s) => normalizeText(s.name).includes(q) || normalizeText(s.category).includes(q));
    }

    // Sport filter
    if (activeFilter === "live") {
      streams = streams.filter((s) => isStreamLive(s));
    } else if (activeFilter !== "all") {
      const aliases = CATEGORY_ALIASES[activeFilter] || [activeFilter];
      streams = streams.filter((s) => {
        const cat = normalizeText(s.category);
        return aliases.some((a) => cat.includes(a));
      });
    }

    // Group by category
    const groups = new Map<string, ExternalStream[]>();
    for (const s of streams) {
      const cat = s.category || "Other";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(s);
    }

    // Sort groups: live events first, then alphabetical
    const result: GroupedCategory[] = [];
    for (const [name, categoryStreams] of groups) {
      const liveCount = categoryStreams.filter(isStreamLive).length;
      // Sort within category: live first, then by start time
      categoryStreams.sort((a, b) => {
        const aLive = isStreamLive(a) ? 0 : 1;
        const bLive = isStreamLive(b) ? 0 : 1;
        if (aLive !== bLive) return aLive - bLive;
        return (a.starts_at || 0) - (b.starts_at || 0);
      });
      result.push({ name, displayName: name, streams: categoryStreams, liveCount });
    }
    result.sort((a, b) => {
      if (a.liveCount !== b.liveCount) return b.liveCount - a.liveCount;
      return a.name.localeCompare(b.name);
    });
    return result;
  }, [externalStreams, activeFilter, searchQuery]);

  const totalLive = useMemo(() => externalStreams.filter(isStreamLive).length, [externalStreams]);
  const totalStreams = useMemo(() => externalStreams.length, [externalStreams]);

  const handleStreamClick = useCallback((stream: ExternalStream) => {
    if (!stream.iframe) {
      toast.error("No hay enlace disponible");
      return;
    }
    const { home, away } = parseTeams(stream.name);
    const title = stream.name || `${away} vs ${home}`;
    openPlayer(title, { url1: stream.iframe }, "live");
  }, [openPlayer]);

  const today = new Date();
  const dateStr = today.toLocaleDateString("es-ES", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="relative mb-5">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3.5">
            <div className="relative group">
              <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-primary/20 to-primary-glow/10 blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative p-0.5 rounded-[18px] bg-gradient-to-br from-white/[0.12] to-white/[0.02]">
                <img src={fluxoLogo} alt="FluxoTV" className="relative w-10 h-10 rounded-[14px] shadow-2xl" />
              </div>
            </div>
            <div className="hidden sm:flex items-baseline gap-1">
              <span className="font-display text-[26px] text-foreground tracking-[0.08em]">FLUXO</span>
              <span className="font-display text-[26px] tracking-[0.08em] gradient-text">TV</span>
            </div>
          </div>

          <div className="relative flex-1 max-w-xs group">
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-primary/10 via-primary-glow/5 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 w-3.5 h-3.5 text-muted-foreground/30 pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar equipos, ligas..."
                className="pl-10 h-11 rounded-2xl border-white/[0.04] bg-white/[0.025] hover:bg-white/[0.04] focus:bg-white/[0.04] focus:ring-1 focus:ring-primary/20 focus:border-primary/15 transition-all duration-300 placeholder:text-muted-foreground/25 text-sm backdrop-blur-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {loading && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.04]">
                <Loader2 className="w-3.5 h-3.5 text-primary/50 animate-spin" />
                <span className="text-[10px] text-muted-foreground/30 hidden sm:inline">Cargando...</span>
              </div>
            )}
            {totalLive > 0 && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-destructive/[0.08] border border-destructive/[0.15] backdrop-blur-sm"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                </span>
                <span className="text-xs font-bold text-destructive tabular-nums">{totalLive}</span>
                <span className="text-[10px] text-destructive/60 font-medium hidden sm:inline">LIVE</span>
              </motion.div>
            )}
            <button
              onClick={() => { fetchExternalStreams(true); fetchEventLinks(); }}
              className="h-11 w-11 rounded-2xl bg-white/[0.025] border border-white/[0.04] flex items-center justify-center text-muted-foreground/30 hover:text-foreground/70 hover:bg-white/[0.05] hover:border-white/[0.08] transition-all duration-300 backdrop-blur-sm"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Sport filter chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide">
          {SPORT_FILTERS.map((filter) => {
            const isActive = activeFilter === filter.value;
            const isLiveFilter = filter.value === "live";
            return (
              <motion.button
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                whileTap={{ scale: 0.96 }}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[13px] font-semibold whitespace-nowrap transition-all duration-300 overflow-hidden",
                  isActive
                    ? isLiveFilter
                      ? "text-white shadow-lg shadow-destructive/20"
                      : "text-white shadow-lg shadow-primary/20"
                    : "text-muted-foreground/40 hover:text-muted-foreground/70 border border-white/[0.03] hover:border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.035]",
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="filter-tab-bg"
                    className={cn(
                      "absolute inset-0 rounded-2xl",
                      isLiveFilter
                        ? "bg-gradient-to-br from-destructive via-destructive to-destructive/80"
                        : "bg-gradient-to-br from-primary via-primary to-primary-glow"
                    )}
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  />
                )}
                {isActive && <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent rounded-2xl" />}
                {isActive && <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />}
                <span className="relative z-10 text-sm">{filter.emoji}</span>
                <span className="relative z-10">{filter.label}</span>
                {isLiveFilter && totalLive > 0 && (
                  <span className={cn(
                    "relative z-10 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                    isActive ? "bg-white/20 text-white" : "bg-destructive/15 text-destructive/70"
                  )}>
                    {totalLive}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Date header */}
      <div className="flex items-center gap-3 px-1 mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary/60" />
          <span className="text-sm font-semibold text-primary/80 capitalize">{activeFilter === "live" ? "En vivo ahora" : "Hoy"}</span>
        </div>
        <span className="text-[12px] text-muted-foreground/30 capitalize">{dateStr}</span>
        <div className="flex-1" />
        <span className="text-[11px] text-muted-foreground/20 tabular-nums">
          {activeFilter === "live" ? `${totalLive} eventos activos` : `${totalStreams} eventos`}
        </span>
      </div>

      {/* Schedule list */}
      {loading && !streamsLoaded ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/[0.04] bg-card/50 overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-3">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </div>
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="px-4 py-3.5 flex items-center gap-3 border-t border-white/[0.03]">
                  <Skeleton className="h-4 w-12" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3.5 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : groupedCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="relative mb-8">
            <div className="absolute -inset-8 rounded-full bg-primary/[0.03] blur-3xl" />
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.04] flex items-center justify-center">
              <span className="text-5xl">🏟️</span>
            </div>
          </div>
          <p className="text-lg font-semibold text-foreground/50 mb-2">No hay eventos</p>
          <p className="text-sm text-muted-foreground/30 max-w-xs">
            {searchQuery ? "No se encontraron resultados" : "No hay transmisiones disponibles en este momento"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {groupedCategories.map((group, gIdx) => (
              <motion.div
                key={group.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: gIdx * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl border border-white/[0.04] bg-card/30 backdrop-blur-sm overflow-hidden"
              >
                {/* Category header */}
                <div className="flex items-center justify-between px-4 py-3 bg-white/[0.015]">
                  <div className="flex items-center gap-2.5">
                    {group.liveCount > 0 && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-50" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                      </span>
                    )}
                    <h3 className="text-sm font-bold text-foreground/90 uppercase tracking-wide">
                      {group.displayName}
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground/30 bg-white/[0.04] px-2.5 py-1 rounded-lg tabular-nums">
                    {group.streams.length}
                  </span>
                </div>

                {/* Event rows */}
                <div>
                  {group.streams.map((stream) => {
                    const { home, away } = parseTeams(stream.name);
                    const live = isStreamLive(stream);
                    const time = formatStreamTime(stream.starts_at);
                    return (
                      <ScheduleRow
                        key={stream.id}
                        id={stream.id}
                        name={stream.name}
                        teamHome={home}
                        teamAway={away}
                        time={time}
                        isLive={live}
                        hasLink={Boolean(stream.iframe)}
                        isFavorite={favorites.has(stream.id)}
                        onToggleFavorite={() => toggleFavorite(stream.id)}
                        onClick={() => handleStreamClick(stream)}
                      />
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Footer stats */}
      <div className="flex items-center justify-center pt-8 pb-3">
        <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-white/[0.015] border border-white/[0.03] backdrop-blur-sm">
          <Zap className="w-3.5 h-3.5 text-primary/40" />
          <span className="text-[11px] text-muted-foreground/25 font-medium tabular-nums">{totalStreams} eventos</span>
          <span className="w-px h-3 bg-white/[0.06]" />
          <span className="text-[11px] text-primary/40 font-medium tabular-nums">{totalLive} en vivo</span>
          {loading && (
            <>
              <span className="w-px h-3 bg-white/[0.06]" />
              <Loader2 className="w-3 h-3 text-primary/30 animate-spin" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
