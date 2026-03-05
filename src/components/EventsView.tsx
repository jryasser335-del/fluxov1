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

// Sport category tabs
const SPORT_TABS = [
  { value: "all", label: "All Sports", emoji: "🏆" },
  { value: "basketball", label: "Basketball", emoji: "🏀", leagues: ["nba", "wnba", "ncaab"] },
  { value: "baseball", label: "Baseball", emoji: "⚾", leagues: ["mlb", "mlb.spring"] },
  { value: "football", label: "Football", emoji: "⚽", leagues: ["eng.1", "esp.1", "ger.1", "ita.1", "fra.1", "uefa.champions", "uefa.europa", "mex.1", "arg.1", "bra.1", "mls", "conmebol.libertadores"] },
  { value: "boxing", label: "Boxing", emoji: "🥊", leagues: ["boxing"] },
  { value: "mma", label: "MMA", emoji: "🥋", leagues: ["ufc"] },
  { value: "wrestling", label: "Wrestling", emoji: "🤼", leagues: ["wwe"] },
  { value: "hockey", label: "Hockey", emoji: "🏒", leagues: ["nhl"] },
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
  const [activeSport, setActiveSport] = useState("all");
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
    if (activeSport === "all") {
      // Fetch the most popular leagues
      return ["nba", "mlb", "eng.1", "esp.1", "uefa.champions", "ufc", "boxing", "wwe", "nhl", "wnba"];
    }
    const tab = SPORT_TABS.find(t => t.value === activeSport);
    return tab?.leagues || [];
  }, [activeSport]);

  // Get available sub-league options for current sport tab
  const currentTab = SPORT_TABS.find(t => t.value === activeSport);
  const availableLeagues = useMemo(() => {
    if (activeSport === "all") return LEAGUE_OPTIONS;
    return LEAGUE_OPTIONS.filter(l => currentTab?.leagues?.includes(l.value));
  }, [activeSport, currentTab]);

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
          return (data.events || []).map(event => ({
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
    const sportMap: Record<string, string[]> = {
      basketball: ["basketball"],
      baseball: ["baseball"],
      football: ["soccer", "football"],
      boxing: ["boxing"],
      mma: ["mma"],
      wrestling: ["wrestling"],
      cricket: ["cricket"],
      motorsport: ["motorsport"],
      rugby: ["rugby"],
      tennis: ["tennis"],
      hockey: ["hockey"],
    };

    const q = normalizeText(searchQuery);

    return dbEvents.filter((d) => {
      if (!d.stream_url) return false;

      if (activeSport !== "all") {
        const sportNames = sportMap[activeSport] || [];
        const eventSport = normalizeText(d.sport || "");
        if (!sportNames.some((s) => eventSport.includes(s))) return false;
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

  return (
    <div className="space-y-0">
      {/* Top bar with search */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <img src="/pwa-192x192.png" alt="FluxoTV" className="w-9 h-9 rounded-xl" />
          <span className="font-display text-xl font-bold text-white tracking-wide hidden sm:block">FLUXO</span>
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="pl-10 h-10 rounded-xl border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/30"
          />
        </div>
        <div className="flex items-center gap-2">
          {stats.live > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30">
              <Radio className="w-3 h-3 text-red-400 animate-pulse" />
              <span className="text-xs font-bold text-red-400">{stats.live} Live</span>
            </div>
          )}
          <button
            onClick={() => { loadAllEvents(); fetchEventLinks(); }}
            className="h-10 w-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Sport category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-2">
        {SPORT_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveSport(tab.value)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200",
              activeSport === tab.value
                ? "bg-primary text-white shadow-lg shadow-primary/30"
                : "bg-white/[0.06] text-white/60 hover:bg-white/[0.1] hover:text-white border border-white/[0.08]"
            )}
          >
            <span className="text-sm">{tab.emoji}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Sub-league filter (shows "All" + each league with event counts) */}
      {availableLeagues.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide mb-1">
          <button
            onClick={() => setActiveLeagueFilter(null)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
              activeLeagueFilter === null
                ? "bg-white/[0.12] text-white border border-white/[0.15]"
                : "text-white/40 hover:text-white/70 hover:bg-white/[0.05]"
            )}
          >
            Todas ({allEnrichedEvents.length})
          </button>
          {availableLeagues.map((league) => {
            const count = leagueCounts.get(league.value) || 0;
            return (
              <button
                key={league.value}
                onClick={() => setActiveLeagueFilter(league.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                  activeLeagueFilter === league.value
                    ? "bg-white/[0.12] text-white border border-white/[0.15]"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.05]"
                )}
              >
                {league.label} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>
      )}

      {/* Events grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonEventCard key={i} />
          ))}
        </div>
      ) : filteredEvents.length === 0 && dbOnlyEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
            <span className="text-3xl">🏟️</span>
          </div>
          <p className="text-lg font-bold text-white mb-1">No hay eventos</p>
          <p className="text-sm text-white/40">No se encontraron partidos para esta categoría</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEvents.map((enriched, index) => (
            <div key={enriched.event.id} className="animate-card-entrance" style={{ animationDelay: `${index * 30}ms` }}>
              <EventCard
                event={enriched.event}
                leagueInfo={{ key: enriched.leagueKey, name: enriched.leagueName, sub: enriched.leagueSub, logo: enriched.leagueLogo }}
                hasLink={eventLinks.has(enriched.event.id)}
                isFavorite={favorites.has(enriched.event.id)}
                onToggleFavorite={() => toggleFavorite(enriched.event.id)}
                onClick={() => handleEventClick(enriched)}
                formatTime={formatTime}
              />
            </div>
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
            <div
              key={`db-${dbEvent.name}-${index}`}
              className="animate-card-entrance cursor-pointer"
              style={{ animationDelay: `${(filteredEvents.length + index) * 30}ms` }}
              onClick={() => handleDbEventClick(dbEvent)}
            >
              <DbEventCard event={dbEvent} />
            </div>
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

// Simple card for DB-only events
function DbEventCard({ event }: { event: { name: string; team_home: string | null; team_away: string | null; sport: string | null; league: string | null; is_live: boolean; stream_url: string | null } }) {
  return (
    <div className={cn(
      "group relative rounded-2xl overflow-hidden transition-all duration-300 border cursor-pointer hover:scale-[1.02]",
      event.is_live ? "border-red-500/30 shadow-[0_0_20px_-8px] shadow-red-500/20" : "border-white/[0.08] hover:border-white/15"
    )}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d1117]/60 via-[#0d1117]/80 to-[#0d1117]/95" />
      
      <div className="relative p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className={cn(
            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
            event.is_live ? "bg-red-500/20 text-red-400" : "bg-primary/20 text-primary"
          )}>
            {event.sport || "Sports"}
          </span>
          {event.is_live && (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[9px] font-bold text-red-400">LIVE</span>
            </div>
          )}
        </div>

        <h3 className="text-sm font-bold text-white leading-tight mb-1">
          {event.team_home || "TBD"} vs. {event.team_away || "TBD"}
        </h3>
        {event.league && (
          <p className="text-[10px] text-white/30">{event.league}</p>
        )}

        {event.stream_url && (
          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-white/[0.06]">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] font-semibold text-emerald-400">Disponible</span>
          </div>
        )}
      </div>
    </div>
  );
}
