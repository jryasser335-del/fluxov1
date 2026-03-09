import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { fetchESPNScoreboard, ESPNEvent, ESPNResponse } from "@/lib/api";
import { LEAGUE_OPTIONS } from "@/lib/constants";
import { usePlayerModal } from "@/hooks/usePlayerModal";
import { supabase } from "@/integrations/supabase/client";
import { EventCard } from "./events/EventCard";

import { SkeletonEventCard } from "./Skeleton";
import { Search, RefreshCw, Radio, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import fluxoLogo from "@/assets/fluxotv-logo.png";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Sport category tabs - each league is its own tab for precise filtering
const SPORT_TABS = [
  { value: "football", label: "Football", emoji: "⚽", leagues: [
    "eng.1", "esp.1", "ger.1", "ita.1", "fra.1", "uefa.champions",
    "uefa.europa", "esp.copa_del_rey", "eng.fa", "eng.league_cup",
    "ger.dfb_pokal", "ita.coppa_italia", "fra.coupe_de_france",
    "ned.1", "por.1", "tur.1", "mex.1", "arg.1", "bra.1",
    "conmebol.libertadores", "mls"
  ]},
  { value: "nba", label: "NBA", emoji: "🏀", leagues: ["nba"] },
  { value: "mlb", label: "MLB", emoji: "⚾", leagues: ["mlb", "baseball.wbc"] },
  { value: "nhl", label: "NHL", emoji: "🏒", leagues: ["nhl"] },
  { value: "boxing", label: "Boxing", emoji: "🥊", leagues: ["boxing"] },
  { value: "mma", label: "MMA", emoji: "🥋", leagues: ["ufc"] },
  { value: "wrestling", label: "WWE", emoji: "🤼", leagues: ["wwe"] },
];

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

// Extended event with league metadata
interface EnrichedEvent {
  event: ESPNEvent;
  leagueKey: string;
  leagueName: string;
  leagueSub: string;
  leagueLogo: string;
}

function findBestExternalMatches(
  streams: ExternalStream[],
  homeName: string,
  awayName: string,
  homeShort: string,
  awayShort: string,
): ExternalStream[] {
  const scored: { stream: ExternalStream; score: number }[] = [];
  for (const s of streams) {
    const sName = s.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const homeMatch = [homeName, homeShort].some(n => n.length > 2 && sName.includes(n));
    const awayMatch = [awayName, awayShort].some(n => n.length > 2 && sName.includes(n));
    const score = (homeMatch ? 1 : 0) + (awayMatch ? 1 : 0);
    if (score >= 1) scored.push({ stream: s, score });
  }
  // Sort by score desc, then prefer different sources for diversity
  scored.sort((a, b) => b.score - a.score);
  const result: ExternalStream[] = [];
  const usedSources = new Set<string>();
  // First pass: pick best from each source
  for (const { stream } of scored) {
    if (result.length >= 3) break;
    if (!usedSources.has(stream.source)) {
      result.push(stream);
      usedSources.add(stream.source);
    }
  }
  // Second pass: fill remaining slots
  for (const { stream } of scored) {
    if (result.length >= 3) break;
    if (!result.includes(stream)) result.push(stream);
  }
  return result;
}

const normalizeText = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();


const LEAGUE_LOGO_FALLBACKS: Record<string, string> = {
  "eng.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/23.png",
  "esp.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/15.png",
  "ger.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/10.png",
  "ita.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/12.png",
  "fra.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/9.png",
  "uefa.champions": "https://a.espncdn.com/i/leaguelogos/soccer/500/2.png",
  "uefa.europa": "https://a.espncdn.com/i/leaguelogos/soccer/500/2310.png",
};

const DB_LEAGUE_ALIASES: Record<string, string[]> = {
  "eng.1": ["premier league", "premier"],
  "esp.1": ["laliga", "la liga"],
  "ger.1": ["bundesliga"],
  "ita.1": ["serie a"],
  "fra.1": ["ligue 1", "ligue one"],
  "uefa.champions": ["champions", "uefa champions"],
  "uefa.europa": ["europa league", "uefa europa"],
  "mex.1": ["liga mx"],
  "arg.1": ["liga argentina", "primera division argentina"],
  "bra.1": ["brasileirao", "brasileirao serie a"],
  mls: ["mls", "major league soccer"],
  "conmebol.libertadores": ["libertadores", "copa libertadores"],
};

const getLeagueLogoFallback = (leagueKey: string) => LEAGUE_LOGO_FALLBACKS[leagueKey] || "";

export function EventsView() {
  const { openPlayer, closePlayer } = usePlayerModal();
  const [activeSport, setActiveSport] = useState("football");
  const [activeLeagueFilter, setActiveLeagueFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [allEnrichedEvents, setAllEnrichedEvents] = useState<EnrichedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const [dbEvents, setDbEvents] = useState<DbEvent[]>([]);
  const [externalStreams, setExternalStreams] = useState<ExternalStream[]>([]);
  const refreshInFlightRef = useRef(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("fluxoFavEvents");
    return new Set(saved ? JSON.parse(saved) : []);
  });

  const fetchEventLinks = useCallback(async () => {
    const { data, error } = await supabase
      .from("events")
      .select("espn_id, name, team_home, team_away, stream_url, stream_url_2, stream_url_3, pending_url, is_active, sport, league, is_live, event_date")
      .eq("is_active", true);
    if (!error && data) setDbEvents(data as DbEvent[]);
  }, []);

  // Bulk fetch all external streams on mount
  const fetchExternalStreams = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("fetch-all-streams", { body: {} });
      if (!error && data?.streams) {
        setExternalStreams(data.streams as ExternalStream[]);
        console.log(`📡 Pre-loaded ${data.streams.length} external streams`);
      }
    } catch (err) {
      console.error("Failed to fetch external streams:", err);
    }
  }, []);

  // Get leagues to fetch based on active sport
  const leaguesToFetch = useMemo(() => {
    const tab = SPORT_TABS.find(t => t.value === activeSport);
    return tab?.leagues || [];
  }, [activeSport]);

  // Get available sub-league options for current sport tab
  const currentTab = SPORT_TABS.find(t => t.value === activeSport);
  const availableLeagues = useMemo(() => {
    return LEAGUE_OPTIONS.filter(l => currentTab?.leagues?.includes(l.value));
  }, [currentTab]);

  // Fetch ALL leagues for the current sport simultaneously
  const loadAllEvents = useCallback(async (isRefresh = false) => {
    if (isRefresh && refreshInFlightRef.current) return;

    if (leaguesToFetch.length === 0) {
      setAllEnrichedEvents([]);
      setLoading(false);
      setHasInitialLoad(true);
      return;
    }

    const shouldShowBlockingLoader = !isRefresh && !hasInitialLoad;
    if (shouldShowBlockingLoader) setLoading(true);
    if (isRefresh) refreshInFlightRef.current = true;

    try {
      const results = await Promise.allSettled(
        leaguesToFetch.map(async (leagueKey) => {
          const data = await fetchESPNScoreboard(leagueKey);
          const lg = data.leagues?.[0];
          const leagueLogo = lg?.logos?.[0]?.href || getLeagueLogoFallback(leagueKey);
          const leagueName = lg?.name || lg?.abbreviation || leagueKey;
          const leagueSub = lg?.abbreviation || leagueKey.toUpperCase();

          const filteredEvents = (data.events || []).filter(() => true);

          return filteredEvents.map(event => ({
            event,
            leagueKey,
            leagueName,
            leagueSub,
            leagueLogo,
          }));
        })
      );

      const enriched: EnrichedEvent[] = [];
      const seenIds = new Set<string>();
      for (const result of results) {
        if (result.status === "fulfilled") {
          for (const item of result.value) {
            if (!seenIds.has(item.event.id)) {
              seenIds.add(item.event.id);
              enriched.push(item);
            }
          }
        }
      }

      // En refresh silencioso, conserva datos previos si esta tanda vino vacía/fallida.
      if (enriched.length > 0 || !isRefresh || !hasInitialLoad) {
        setAllEnrichedEvents(enriched);
      }
    } catch {
      // Evita vaciar la UI en refrescos de fondo con fallos de red temporales.
      if (!isRefresh) setAllEnrichedEvents([]);
    } finally {
      if (!hasInitialLoad) setHasInitialLoad(true);
      setLoading(false);
      if (isRefresh) refreshInFlightRef.current = false;
    }
  }, [leaguesToFetch, hasInitialLoad]);

  // Build eventLinks map - now uses external streams for instant matching
  const eventLinks = useMemo(() => {
    const linksMap = new Map<string, { url1: string; url2?: string; url3?: string; viewers?: number }>();

    for (const { event: espnEvent } of allEnrichedEvents) {
      // 1) Check DB by ESPN ID
      const byId = dbEvents.find(d => d.espn_id && d.espn_id === espnEvent.id);
      if (byId?.stream_url) {
        linksMap.set(espnEvent.id, { url1: byId.stream_url, url2: byId.stream_url_2 || undefined, url3: byId.stream_url_3 || undefined });
        continue;
      }

      // 2) Fuzzy match DB events
      const comp = espnEvent.competitions?.[0];
      const competitors = comp?.competitors || [];
      const espnHome = competitors.find(c => c.homeAway === "home");
      const espnAway = competitors.find(c => c.homeAway === "away");
      if (!espnHome?.team?.displayName && !espnAway?.team?.displayName) continue;
      const homeName = normalizeText(espnHome?.team?.displayName || "");
      const awayName = normalizeText(espnAway?.team?.displayName || "");
      const homeShort = normalizeText(espnHome?.team?.shortDisplayName || "");
      const awayShort = normalizeText(espnAway?.team?.shortDisplayName || "");

      const dbMatch = dbEvents.find(d => {
        if (!d.stream_url) return false;
        const dAll = normalizeText(`${d.name || ""} ${d.team_home || ""} ${d.team_away || ""}`);
        const homeMatch = [homeName, homeShort].some(n => n.length > 2 && dAll.includes(n));
        const awayMatch = [awayName, awayShort].some(n => n.length > 2 && dAll.includes(n));
        return homeMatch && awayMatch;
      });

      if (dbMatch?.stream_url) {
        linksMap.set(espnEvent.id, { url1: dbMatch.stream_url, url2: dbMatch.stream_url_2 || undefined, url3: dbMatch.stream_url_3 || undefined });
        continue;
      }

      // 3) Match against pre-fetched external streams (PPV.to / Streamed)
      if (externalStreams.length > 0) {
        const extMatches = findBestExternalMatches(externalStreams, homeName, awayName, homeShort, awayShort);
        if (extMatches.length > 0) {
          linksMap.set(espnEvent.id, {
            url1: extMatches[0].iframe,
            url2: extMatches[1]?.iframe,
            url3: extMatches[2]?.iframe,
            viewers: extMatches[0].viewers || 0,
          });
        }
      }
    }
    return linksMap;
  }, [dbEvents, allEnrichedEvents, externalStreams]);

  useEffect(() => {
    fetchEventLinks();
    fetchExternalStreams();
    const channel = supabase
      .channel('events-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchEventLinks())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchEventLinks, fetchExternalStreams]);

  useEffect(() => { loadAllEvents(); }, [loadAllEvents]);

  useEffect(() => {
    const hasLive = allEnrichedEvents.some(e => e.event.competitions?.[0]?.status?.type?.state === "in");
    const interval = setInterval(() => { loadAllEvents(true); fetchEventLinks(); fetchExternalStreams(); }, hasLive ? 30000 : 60000);
    return () => clearInterval(interval);
  }, [allEnrichedEvents, loadAllEvents, fetchEventLinks, fetchExternalStreams]);

  // Reset league filter when sport changes
  useEffect(() => {
    setActiveLeagueFilter(null);
  }, [activeSport]);

  const toggleFavorite = (eventId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(eventId) ? next.delete(eventId) : next.add(eventId);
      localStorage.setItem("fluxoFavEvents", JSON.stringify([...next]));
      return next;
    });
  };

  // DB-only events (scraped, no ESPN match) for current sport/league/search
  const dbOnlyEvents = useMemo(() => {
    // Map tabs to DB sport keywords AND specific league keywords
    const sportMap: Record<string, { sports: string[]; leagues?: string[] }> = {
      nba: { sports: ["basketball"], leagues: ["nba"] },
      mlb: { sports: ["baseball"], leagues: ["mlb", "world baseball classic", "wbc", "clasico mundial"] },
      nhl: { sports: ["hockey"], leagues: ["nhl"] },
      football: { sports: ["soccer", "football"], leagues: ["premier", "laliga", "la liga", "bundesliga", "serie a", "ligue 1", "champions", "europa", "copa del rey", "fa cup", "carabao", "efl", "dfb", "coppa italia", "coupe de france", "eredivisie", "liga portugal", "super lig", "liga mx", "argentina", "brasileirao", "libertadores", "mls"] },
      boxing: { sports: ["boxing"] },
      mma: { sports: ["mma", "ufc"] },
      wrestling: { sports: ["wrestling", "wwe"] },
    };

    const q = normalizeText(searchQuery);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    return dbEvents.filter((d) => {
      if (!d.stream_url) return false;

      // Only today's events
      if (d.event_date) {
        const eventDay = d.event_date.slice(0, 10);
        if (eventDay !== todayStr) return false;
      }

      {
        const config = sportMap[activeSport];
        if (!config) return false;
        const eventSport = normalizeText(d.sport || "");
        const eventLeague = normalizeText(d.league || "");
        const eventName = normalizeText(d.name || "");
        
        // Must match sport
        if (!config.sports.some((s) => eventSport.includes(s))) return false;
        
        // If tab has specific leagues, must also match league
        if (config.leagues) {
          const allText = `${eventLeague} ${eventName}`;
          if (!config.leagues.some((l) => allText.includes(l))) return false;
        }
      }

      if (activeLeagueFilter) {
        const leagueText = normalizeText(`${d.league || ""} ${d.name || ""}`);
        const aliases = DB_LEAGUE_ALIASES[activeLeagueFilter] || [normalizeText(activeLeagueFilter.replace(/\./g, " "))];
        if (!aliases.some((alias) => leagueText.includes(alias))) return false;
      }

      if (q) {
        const haystack = normalizeText(`${d.name || ""} ${d.team_home || ""} ${d.team_away || ""} ${d.league || ""}`);
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [dbEvents, activeSport, activeLeagueFilter, searchQuery]);

  // Filter enriched events by sub-league and search
  const filteredEvents = useMemo(() => {
    let list = [...allEnrichedEvents];
    
    // Filter by sub-league if selected
    if (activeLeagueFilter) {
      list = list.filter(e => e.leagueKey === activeLeagueFilter);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(({ event: e }) => {
        const comp = e.competitions?.[0];
        const teams = comp?.competitors || [];
        return teams.some(t => (t.team?.displayName || "").toLowerCase().includes(q)) ||
          e.name?.toLowerCase().includes(q);
      });
    }

    // Sort: live first, then pre, then post
    const rank = (state: string) => (state === "in" ? 0 : state === "pre" ? 1 : 2);
    list.sort((a, b) => {
      const stateA = a.event.competitions?.[0]?.status?.type?.state || "";
      const stateB = b.event.competitions?.[0]?.status?.type?.state || "";
      return rank(stateA) - rank(stateB);
    });

    return list;
  }, [allEnrichedEvents, activeLeagueFilter, searchQuery]);

  const handleEventClick = (enriched: EnrichedEvent) => {
    const comp = enriched.event.competitions?.[0];
    const status = comp?.status?.type;
    const teams = comp?.competitors || [];
    const away = teams.find((c) => c.homeAway === "away") || teams[0];
    const home = teams.find((c) => c.homeAway === "home") || teams[1];
    const title = `${away?.team?.displayName || "Equipo"} vs ${home?.team?.displayName || "Equipo"}`;

    // Partido finalizado
    if (status?.state === "post") {
      toast.info("Partido finalizado", {
        description: `${title} ya ha terminado.`,
      });
      return;
    }

    // Usar links pre-cargados del scraper
    const existingLink = eventLinks.get(enriched.event.id);
    if (existingLink?.url1) {
      openPlayer(title, existingLink);
      return;
    }

    // No hay stream disponible — dar feedback al usuario
    if (status?.state === "pre") {
      toast.info("Aún no disponible", {
        description: "El link estará disponible 30 minutos antes del inicio.",
      });
    } else {
      toast.info("Sin señal disponible", {
        description: "No se encontró un stream para este partido.",
      });
    }
  };

  const handleDbEventClick = (event: DbEvent) => {
    if (!event.stream_url) return;
    const title = `${event.team_home || "Team"} vs ${event.team_away || "Team"}`;
    openPlayer(title, { url1: event.stream_url, url2: event.stream_url_2 || undefined, url3: event.stream_url_3 || undefined });
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
    } catch { return "—"; }
  };

  const stats = useMemo(() => {
    const live = filteredEvents.filter(e => e.event.competitions?.[0]?.status?.type?.state === "in").length;
    const withLinks = filteredEvents.filter(e => eventLinks.has(e.event.id)).length;
    return { total: filteredEvents.length, live, withLinks };
  }, [filteredEvents, eventLinks]);

  // Count events per league for badges
  const leagueCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of allEnrichedEvents) {
      counts.set(e.leagueKey, (counts.get(e.leagueKey) || 0) + 1);
    }
    return counts;
  }, [allEnrichedEvents]);

  const gridEvents = filteredEvents;

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="relative mb-5">
        <div className="relative flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-br from-primary/30 to-primary-glow/15 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <img src={fluxoLogo} alt="FluxoTV" className="relative w-10 h-10 rounded-xl shadow-2xl ring-1 ring-white/[0.06]" />
            </div>
            <div className="hidden sm:flex items-baseline gap-0.5">
              <span className="font-display text-2xl text-foreground tracking-wider">FLUXO</span>
              <span className="font-display text-2xl tracking-wider gradient-text">TV</span>
            </div>
          </div>
          <div className="relative flex-1 max-w-sm group">
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary/10 to-primary-glow/5 opacity-0 group-focus-within:opacity-100 blur-sm transition-opacity duration-500" />
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-3.5 h-3.5 text-muted-foreground/40 pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="pl-9 h-10 rounded-xl border-white/[0.04] bg-white/[0.02] text-foreground placeholder:text-muted-foreground/30 focus:ring-1 focus:ring-primary/20 focus:border-primary/15 transition-all duration-300 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stats.live > 0 && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 border border-primary/15"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                </span>
                <span className="text-[11px] font-bold text-primary tracking-wide">{stats.live}</span>
              </motion.div>
            )}
            <button
              onClick={() => { loadAllEvents(); fetchEventLinks(); }}
              className="h-10 w-10 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-white/[0.05] hover:border-white/[0.08] transition-all duration-300"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Sport Tabs */}
        <div className="relative flex gap-1 overflow-x-auto pb-3 scrollbar-hide mb-3">
          {SPORT_TABS.map((tab) => {
            const isActive = activeSport === tab.value;
            return (
              <motion.button
                key={tab.value}
                onClick={() => setActiveSport(tab.value)}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-all duration-300 overflow-hidden",
                  isActive
                    ? "text-white"
                    : "text-muted-foreground/50 hover:text-muted-foreground border border-white/[0.03] hover:border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.03]"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sport-tab-bg"
                    className="absolute inset-0 bg-gradient-to-r from-primary to-primary-glow rounded-xl"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent rounded-xl" />
                )}
                <span className="relative z-10 text-sm">{tab.emoji}</span>
                <span className="relative z-10">{tab.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Sub-league filter */}
        {(activeSport === "football" || activeSport === "mlb") && availableLeagues.length > 1 && (
          <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
            {availableLeagues.map((league) => {
              const count = leagueCounts.get(league.value) || 0;
              const isActive = activeLeagueFilter === league.value;
              return (
                <button
                  key={league.value}
                  onClick={() => setActiveLeagueFilter(league.value)}
                  className={cn(
                    "relative px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all duration-300",
                    isActive
                      ? "bg-white/[0.08] text-foreground/90 border border-white/[0.1]"
                      : "text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-white/[0.02]"
                  )}
                >
                  {league.label} {count > 0 && <span className="text-muted-foreground/20 ml-0.5">{count}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Events grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonEventCard key={i} />
          ))}
        </div>
      ) : gridEvents.length === 0 && dbOnlyEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div className="relative mb-6">
            <div className="absolute -inset-6 rounded-full bg-primary/[0.03] blur-3xl" />
            <div className="relative w-20 h-20 rounded-3xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center">
              <span className="text-4xl">🏟️</span>
            </div>
          </div>
          <p className="text-base font-semibold text-foreground/60 mb-1">No hay eventos</p>
          <p className="text-sm text-muted-foreground/40">No se encontraron partidos para esta categoría</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {gridEvents.map((enriched, index) => (
            <motion.div
              key={enriched.event.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.025, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <EventCard
                event={enriched.event}
                leagueInfo={{ key: enriched.leagueKey, name: enriched.leagueName, sub: enriched.leagueSub, logo: enriched.leagueLogo }}
                hasLink={Boolean(eventLinks.get(enriched.event.id)?.url1)}
                isResolving={false}
                isFavorite={favorites.has(enriched.event.id)}
                onToggleFavorite={() => toggleFavorite(enriched.event.id)}
                onClick={() => handleEventClick(enriched)}
                formatTime={formatTime}
              />
            </motion.div>
          ))}
          {/* DB-only events */}
          {dbOnlyEvents.filter(d => {
            return !allEnrichedEvents.some(({ event: e }) => {
              const comp = e.competitions?.[0];
              const competitors = comp?.competitors || [];
              const home = competitors.find(c => c.homeAway === "home");
              const away = competitors.find(c => c.homeAway === "away");
              if (!home?.team?.displayName || !away?.team?.displayName) return false;
              const dAll = normalizeText(`${d.name || ""} ${d.team_home || ""} ${d.team_away || ""}`);
              return [normalizeText(home.team.displayName), normalizeText(home.team.shortDisplayName || "")].some(n => n.length > 2 && dAll.includes(n)) &&
                [normalizeText(away.team.displayName), normalizeText(away.team.shortDisplayName || "")].some(n => n.length > 2 && dAll.includes(n));
            });
          }).map((dbEvent, index) => (
            <motion.div
              key={`db-${dbEvent.name}-${index}`}
              className="cursor-pointer"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (gridEvents.length + index) * 0.025, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => handleDbEventClick(dbEvent)}
            >
              <DbEventCard event={dbEvent} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Bottom counter */}
      <div className="flex items-center justify-center pt-8 pb-2">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.03] text-[11px] text-muted-foreground/30">
          <Sparkles className="w-3 h-3" />
          {stats.total} eventos · {stats.withLinks} con señal
        </div>
      </div>
    </div>
  );
}

// Team logo cache with TTL (avoid persisting null forever)
const TEAM_LOGO_TTL_OK = 24 * 60 * 60 * 1000;
const TEAM_LOGO_TTL_NULL = 2 * 60 * 1000;
const teamLogoCache = new Map<string, { logo: string | null; ts: number }>();

async function fetchTeamLogo(teamName: string): Promise<string | null> {
  if (!teamName || teamName.length < 2) return null;
  const cacheKey = teamName.toLowerCase().trim();
  const cached = teamLogoCache.get(cacheKey);
  if (cached) {
    const ttl = cached.logo ? TEAM_LOGO_TTL_OK : TEAM_LOGO_TTL_NULL;
    if (Date.now() - cached.ts < ttl) return cached.logo;
  }

  try {
    const candidates = Array.from(new Set([
      teamName,
      teamName.replace(/\b(Baseball|Basketball|Football|Hockey|Rugby)\b/gi, "").trim(),
      teamName.replace(/\b(Fc|CF|SC|SK|AC|Club)\b/gi, "").trim(),
    ].filter(Boolean)));

    for (const candidate of candidates) {
      const { data, error } = await supabase.functions.invoke("team-logo-search", {
        body: { t: candidate },
      });
      if (error) continue;
      const logo = data?.logo || null;
      if (logo) {
        teamLogoCache.set(cacheKey, { logo, ts: Date.now() });
        return logo;
      }
    }

    teamLogoCache.set(cacheKey, { logo: null, ts: Date.now() });
    return null;
  } catch {
    teamLogoCache.set(cacheKey, { logo: null, ts: Date.now() });
    return null;
  }
}

function TeamBadge({ name, fallback }: { name: string | null; fallback: string }) {
  const [logo, setLogo] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!name) return;
    setError(false);
    fetchTeamLogo(name).then((url) => {
      if (!cancelled) setLogo(url || null);
    });
    return () => { cancelled = true; };
  }, [name]);

  if (logo && !error) {
    return (
      <div className="relative">
        <div className="absolute inset-0 blur-xl opacity-30 scale-150">
          <img src={logo} alt="" className="w-full h-full object-contain" loading="lazy" />
        </div>
        <img
          src={logo}
          alt={name || ""}
          className="relative w-12 h-12 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
          onError={() => setError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-display text-lg text-foreground/60 border border-white/[0.06] bg-white/[0.04]">
      {fallback}
    </div>
  );
}

// DB-only event card with real team logos
function DbEventCard({ event }: { event: { name: string; team_home: string | null; team_away: string | null; sport: string | null; league: string | null; is_live: boolean; stream_url: string | null } }) {
  const homeInitials = (event.team_home || "?").slice(0, 3).toUpperCase();
  const awayInitials = (event.team_away || "?").slice(0, 3).toUpperCase();

  return (
    <div className="card-wrapper">
      <div className={cn(
        "premium-card card-shine cursor-pointer group rounded-2xl border border-white/[0.06] bg-card",
        event.is_live && "border-primary/20"
      )}>
        <div className="relative aspect-[16/10] overflow-hidden rounded-t-2xl bg-gradient-to-br from-primary/10 via-card to-accent/10">
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

          {event.is_live && (
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/90 backdrop-blur-sm shadow-lg shadow-primary/20">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
              </span>
              <span className="text-[10px] font-bold text-white tracking-[0.15em]">EN VIVO</span>
            </div>
          )}

          <div className="absolute inset-0 flex items-center justify-center gap-5 px-6">
            <TeamBadge name={event.team_away} fallback={awayInitials} />
            <span className="font-display text-base text-white/10 tracking-[0.3em]">VS</span>
            <TeamBadge name={event.team_home} fallback={homeInitials} />
          </div>
        </div>

        <div className="bg-card px-3 pt-2.5 pb-2 space-y-1">
          <h3 className="text-[11px] font-semibold text-foreground/80 leading-tight truncate">
            {event.team_home || "TBD"} vs {event.team_away || "TBD"}
          </h3>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-medium text-muted-foreground/40">
              {event.league || event.sport || "Sports"}
            </span>
            {event.stream_url && (
              <>
                <span className="text-[9px] text-muted-foreground/20">·</span>
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-success" />
                  <span className="text-[9px] font-medium text-success/70">Señal</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
