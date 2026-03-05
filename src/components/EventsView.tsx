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

// Sport category tabs
const SPORT_TABS = [
  { value: "all", label: "All Sports", emoji: "🏆" },
  { value: "football", label: "Football", emoji: "⚽", leagues: ["eng.1", "esp.1", "ger.1", "ita.1", "fra.1", "uefa.champions"] },
  { value: "basketball", label: "Basketball", emoji: "🏀", leagues: ["nba", "wnba", "ncaab"] },
  { value: "baseball", label: "Baseball", emoji: "⚾", leagues: ["mlb", "mlb.spring"] },
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
      return ["nba", "mlb", "eng.1", "esp.1", "ger.1", "ita.1", "fra.1", "uefa.champions", "ufc", "boxing", "wwe", "nhl", "wnba", "esp.copa_del_rey", "eng.fa", "eng.league_cup", "ger.dfb_pokal", "ita.coppa_italia", "fra.coupe_de_france"];
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

  const gridEvents = filteredEvents;

  return (
    <div className="space-y-0">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <img src={fluxoLogo} alt="FluxoTV" className="w-10 h-10 rounded-xl shadow-lg shadow-primary/10" />
          <div className="hidden sm:block">
            <span className="font-display text-2xl text-white tracking-wider">FLUXO</span>
            <span className="font-display text-2xl text-primary tracking-wider">TV</span>
          </div>
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events..."
            className="pl-10 h-10 rounded-xl border-white/[0.06] bg-white/[0.03] text-white placeholder:text-white/25 focus:ring-primary/30 focus:border-primary/30 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          {stats.live > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 backdrop-blur-sm">
              <Radio className="w-3 h-3 text-primary animate-pulse" />
              <span className="text-xs font-bold text-primary">{stats.live} Live</span>
            </div>
          )}
          <button
            onClick={() => { loadAllEvents(); fetchEventLinks(); }}
            className="h-10 w-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-300"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Sport category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-3">
        {SPORT_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveSport(tab.value)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-300",
              activeSport === tab.value
                ? "bg-primary text-white shadow-lg shadow-primary/25 scale-[1.02]"
                : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/80 border border-white/[0.06] hover:border-white/[0.1]"
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
      ) : gridEvents.length === 0 && dbOnlyEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
            <span className="text-3xl">🏟️</span>
          </div>
          <p className="text-lg font-bold text-white mb-1">No hay eventos</p>
          <p className="text-sm text-white/40">No se encontraron partidos para esta categoría</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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

// Team logo cache
const teamLogoCache = new Map<string, string | null>();

async function fetchTeamLogo(teamName: string): Promise<string | null> {
  if (!teamName || teamName.length < 2) return null;
  const cacheKey = teamName.toLowerCase().trim();
  if (teamLogoCache.has(cacheKey)) return teamLogoCache.get(cacheKey) || null;

  try {
    const res = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName)}`);
    if (!res.ok) { teamLogoCache.set(cacheKey, null); return null; }
    const data = await res.json();
    const team = data?.teams?.[0];
    const badge = team?.strBadge || team?.strLogo || null;
    teamLogoCache.set(cacheKey, badge);
    return badge;
  } catch {
    teamLogoCache.set(cacheKey, null);
    return null;
  }
}

function TeamBadge({ name, fallback }: { name: string | null; fallback: string }) {
  const [logo, setLogo] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    if (!name || attempted.current) return;
    attempted.current = true;
    fetchTeamLogo(name).then(url => { if (url) setLogo(url); });
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
