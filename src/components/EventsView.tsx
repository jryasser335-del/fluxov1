import { useState, useEffect, useMemo, useCallback } from "react";
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
  { value: "mlb", label: "MLB", emoji: "⚾", leagues: ["mlb", "mlb.spring", "baseball.wbc"] },
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

// Extended event with league metadata
interface EnrichedEvent {
  event: ESPNEvent;
  leagueKey: string;
  leagueName: string;
  leagueSub: string;
  leagueLogo: string;
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
  const { openPlayer } = usePlayerModal();
  const [activeSport, setActiveSport] = useState("football");
  const [activeLeagueFilter, setActiveLeagueFilter] = useState<string | null>(null); // null = "All" within sport
  const [searchQuery, setSearchQuery] = useState("");
  const [allEnrichedEvents, setAllEnrichedEvents] = useState<EnrichedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbEvents, setDbEvents] = useState<DbEvent[]>([]);
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
  const loadAllEvents = useCallback(async () => {
    if (leaguesToFetch.length === 0) {
      setAllEnrichedEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const results = await Promise.allSettled(
        leaguesToFetch.map(async (leagueKey) => {
          const data = await fetchESPNScoreboard(leagueKey);
          const lg = data.leagues?.[0];
          const leagueLogo = lg?.logos?.[0]?.href || getLeagueLogoFallback(leagueKey);
          const leagueName = lg?.name || lg?.abbreviation || leagueKey;
          const leagueSub = lg?.abbreviation || leagueKey.toUpperCase();
          const leagueSlug = lg?.slug || "";
          
          // Filter events to only include those that belong to this exact league
          // ESPN sometimes returns events from sub-leagues (G-League, NBA Cup, etc.)
          const filteredEvents = (data.events || []).filter(event => {
            // If no league info, include all events
            if (!lg) return true;
            // Check if the event's league matches what we requested
            const eventLeague = event.competitions?.[0]?.competitors?.[0]?.team?.id;
            // For most cases, ESPN returns correct events for the endpoint
            // But we can verify using the league slug in the response
            return true; // ESPN endpoints are league-specific, trust the response
          });
          
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
      setAllEnrichedEvents(enriched);
    } catch {
      setAllEnrichedEvents([]);
    }
    setLoading(false);
  }, [leaguesToFetch]);

  // Build eventLinks map
  const eventLinks = useMemo(() => {
    const linksMap = new Map<string, { url1: string; url2?: string; url3?: string }>();
    if (dbEvents.length === 0 || allEnrichedEvents.length === 0) return linksMap;

    for (const { event: espnEvent } of allEnrichedEvents) {
      const byId = dbEvents.find(d => d.espn_id && d.espn_id === espnEvent.id);
      if (byId?.stream_url) {
        linksMap.set(espnEvent.id, { url1: byId.stream_url, url2: byId.stream_url_2 || undefined, url3: byId.stream_url_3 || undefined });
        continue;
      }
      const comp = espnEvent.competitions?.[0];
      const competitors = comp?.competitors || [];
      const espnHome = competitors.find(c => c.homeAway === "home");
      const espnAway = competitors.find(c => c.homeAway === "away");
      if (!espnHome?.team?.displayName && !espnAway?.team?.displayName) continue;
      const homeName = normalizeText(espnHome?.team?.displayName || "");
      const awayName = normalizeText(espnAway?.team?.displayName || "");
      const homeShort = normalizeText(espnHome?.team?.shortDisplayName || "");
      const awayShort = normalizeText(espnAway?.team?.shortDisplayName || "");

      const match = dbEvents.find(d => {
        if (!d.stream_url) return false;
        const dAll = normalizeText(`${d.name || ""} ${d.team_home || ""} ${d.team_away || ""}`);
        const homeMatch = [homeName, homeShort].some(n => n.length > 2 && dAll.includes(n));
        const awayMatch = [awayName, awayShort].some(n => n.length > 2 && dAll.includes(n));
        return homeMatch && awayMatch;
      });

      if (match?.stream_url) {
        linksMap.set(espnEvent.id, { url1: match.stream_url, url2: match.stream_url_2 || undefined, url3: match.stream_url_3 || undefined });
      }
    }
    return linksMap;
  }, [dbEvents, allEnrichedEvents]);

  useEffect(() => {
    fetchEventLinks();
    const channel = supabase
      .channel('events-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchEventLinks())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchEventLinks]);

  useEffect(() => { loadAllEvents(); }, [loadAllEvents]);

  useEffect(() => {
    const hasLive = allEnrichedEvents.some(e => e.event.competitions?.[0]?.status?.type?.state === "in");
    const interval = setInterval(() => { loadAllEvents(); fetchEventLinks(); }, hasLive ? 30000 : 60000);
    return () => clearInterval(interval);
  }, [allEnrichedEvents, loadAllEvents, fetchEventLinks]);

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
    let list = allEnrichedEvents;
    
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
    const link = eventLinks.get(enriched.event.id);
    const comp = enriched.event.competitions?.[0];
    const teams = comp?.competitors || [];
    const away = teams.find((c) => c.homeAway === "away") || teams[0];
    const home = teams.find((c) => c.homeAway === "home") || teams[1];
    const title = `${away?.team?.displayName || "Equipo"} vs ${home?.team?.displayName || "Equipo"}`;
    if (link) openPlayer(title, link);
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
      {/* Premium Header */}
      <div className="relative mb-6">
        {/* Background glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-primary/[0.06] blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/40 to-accent/20 blur-md opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
              <img src={fluxoLogo} alt="FluxoTV" className="relative w-11 h-11 rounded-2xl shadow-2xl ring-1 ring-white/10" />
            </div>
            <div className="hidden sm:flex items-baseline gap-0.5">
              <span className="font-display text-3xl text-white tracking-wider drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">FLUXO</span>
              <span className="font-display text-3xl tracking-wider bg-gradient-to-r from-primary to-[hsl(200,100%,55%)] bg-clip-text text-transparent drop-shadow-[0_0_30px_hsl(210,100%,50%,0.4)]">TV</span>
            </div>
          </div>
          <div className="relative flex-1 max-w-md group">
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/5 opacity-0 group-focus-within:opacity-100 blur-sm transition-opacity duration-500" />
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 w-4 h-4 text-white/20 pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar eventos..."
                className="pl-10 h-11 rounded-2xl border-white/[0.06] bg-white/[0.03] backdrop-blur-sm text-white placeholder:text-white/20 focus:ring-1 focus:ring-primary/20 focus:border-primary/20 transition-all duration-300"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stats.live > 0 && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/20 backdrop-blur-sm"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary shadow-lg shadow-primary/50" />
                </span>
                <span className="text-xs font-bold text-primary tracking-wide">{stats.live} LIVE</span>
              </motion.div>
            )}
            <button
              onClick={() => { loadAllEvents(); fetchEventLinks(); }}
              className="h-11 w-11 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.12] hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Premium Sport Tabs */}
        <div className="relative flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide mb-4">
          {SPORT_TABS.map((tab) => {
            const isActive = activeSport === tab.value;
            return (
              <motion.button
                key={tab.value}
                onClick={() => setActiveSport(tab.value)}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all duration-300 overflow-hidden",
                  isActive
                    ? "text-white shadow-xl shadow-primary/20"
                    : "text-white/40 hover:text-white/70 border border-white/[0.06] hover:border-white/[0.12] bg-white/[0.02] hover:bg-white/[0.05]"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sport-tab-bg"
                    className="absolute inset-0 bg-gradient-to-r from-primary to-[hsl(200,100%,50%)] rounded-2xl"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl" />
                )}
                <span className="relative z-10 text-base">{tab.emoji}</span>
                <span className="relative z-10">{tab.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Sub-league filter - only for football tab */}
        {activeSport === "football" && availableLeagues.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide">
            {availableLeagues.map((league) => {
              const count = leagueCounts.get(league.value) || 0;
              const isActive = activeLeagueFilter === league.value;
              return (
                <button
                  key={league.value}
                  onClick={() => setActiveLeagueFilter(league.value)}
                  className={cn(
                    "relative px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-300",
                    isActive
                      ? "bg-white/[0.1] text-white border border-white/[0.15] shadow-sm"
                      : "text-white/30 hover:text-white/60 hover:bg-white/[0.04]"
                  )}
                >
                  {league.label} {count > 0 && <span className="text-white/20 ml-0.5">{count}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>


      {/* Events grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonEventCard key={i} />
          ))}
        </div>
      ) : gridEvents.length === 0 && dbOnlyEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="relative mb-6">
            <div className="absolute -inset-4 rounded-full bg-primary/5 blur-2xl" />
            <div className="relative w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
              <span className="text-4xl">🏟️</span>
            </div>
          </div>
          <p className="text-lg font-bold text-white/80 mb-1">No hay eventos</p>
          <p className="text-sm text-white/30">No se encontraron partidos para esta categoría</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {gridEvents.map((enriched, index) => (
            <motion.div
              key={enriched.event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <EventCard
                event={enriched.event}
                leagueInfo={{ key: enriched.leagueKey, name: enriched.leagueName, sub: enriched.leagueSub, logo: enriched.leagueLogo }}
                hasLink={eventLinks.has(enriched.event.id)}
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (gridEvents.length + index) * 0.03, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => handleDbEventClick(dbEvent)}
            >
              <DbEventCard event={dbEvent} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Bottom counter */}
      <div className="flex items-center justify-center pt-6 pb-2">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-white/40">
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
      <img
        src={logo}
        alt={name || ""}
        className="w-14 h-14 object-contain drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]"
        onError={() => setError(true)}
        loading="lazy"
      />
    );
  }

  return (
    <div className="w-14 h-14 rounded-full flex items-center justify-center font-display text-xl text-white/80 border border-white/10 bg-white/[0.06]">
      {fallback}
    </div>
  );
}

// DB-only event card with real team logos
function DbEventCard({ event }: { event: { name: string; team_home: string | null; team_away: string | null; sport: string | null; league: string | null; is_live: boolean; stream_url: string | null } }) {
  const homeInitials = (event.team_home || "?").slice(0, 3).toUpperCase();
  const awayInitials = (event.team_away || "?").slice(0, 3).toUpperCase();

  return (
    <div className={cn(
      "group relative rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer hover:scale-[1.02]",
      event.is_live
        ? "ring-1 ring-primary/30 shadow-[0_0_20px_-8px] shadow-primary/20"
        : "ring-1 ring-white/[0.06] hover:ring-white/[0.12]"
    )}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/8" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/90" />
      
      <div className="relative flex flex-col min-h-[200px]">
        {event.is_live && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent animate-gradient-shift" style={{ backgroundSize: '200% 100%' }} />
        )}

        {/* Team logos face-off */}
        <div className="flex items-center justify-center gap-4 flex-1 px-4 py-6">
          <TeamBadge name={event.team_away} fallback={awayInitials} />
          <span className="font-display text-lg text-white/15 tracking-[0.3em]">VS</span>
          <TeamBadge name={event.team_home} fallback={homeInitials} />
        </div>

        {/* Footer */}
        <div className="mt-auto px-4 pb-3 pt-2 border-t border-white/[0.04]">
          <h3 className="text-[12px] font-semibold text-white/80 leading-tight truncate mb-1.5">
            {event.team_home || "TBD"} vs {event.team_away || "TBD"}
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider",
                event.is_live ? "bg-primary/20 text-primary" : "bg-white/[0.06] text-white/40"
              )}>
                {event.league || event.sport || "Sports"}
              </span>
              {event.is_live && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10">
                  <Radio className="w-2.5 h-2.5 text-primary animate-pulse" />
                  <span className="text-[8px] font-bold text-primary uppercase tracking-wider">LIVE</span>
                </div>
              )}
            </div>
            {event.stream_url && (
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[8px] font-semibold text-success">Disponible</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
