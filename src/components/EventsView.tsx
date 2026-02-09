import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchESPNScoreboard, ESPNEvent } from "@/lib/api";
import { LEAGUE_OPTIONS } from "@/lib/constants";
import { usePlayerModal } from "@/hooks/usePlayerModal";
import { useAutoLinkEvents } from "@/hooks/useAutoLinkEvents";
import { supabase } from "@/integrations/supabase/client";
import { Section } from "./Section";
import { EventCard } from "./events/EventCard";
import { EventInfoBanner } from "./events/EventInfoBanner";
import { EventsStats } from "./events/EventsStats";
import { PremiumFilters } from "./events/PremiumFilters";
import { FeaturedMatch } from "./events/FeaturedMatch";
import { SkeletonEventCard } from "./Skeleton";
import { Trophy, Sparkles } from "lucide-react";

// Helper to detect sport from league key
function detectSportFromLeague(key: string): string {
  const k = key.toLowerCase();
  if (["nba", "wnba", "ncaab", "euroleague"].some(l => k.includes(l))) return "Basketball";
  if (["nfl", "ncaaf", "xfl"].some(l => k.includes(l))) return "Football";
  if (["nhl", "khl", "shl", "ahl"].some(l => k.includes(l))) return "Hockey";
  if (k.includes("mlb")) return "Baseball";
  if (["ufc", "bellator", "pfl", "boxing", "mma"].some(l => k.includes(l))) return "MMA";
  if (["atp", "wta", "tennis"].some(l => k.includes(l))) return "Tennis";
  if (["f1", "motogp", "nascar", "indycar"].some(l => k.includes(l))) return "Motorsports";
  return "Soccer";
}

const EVENT_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "live", label: "En vivo" },
  { value: "fav", label: "Favoritos" },
  { value: "nolink", label: "Sin link" },
];

interface EventLink {
  espn_id: string;
  stream_url: string | null;
  stream_url_2: string | null;
  stream_url_3: string | null;
  is_active: boolean;
}

export function EventsView() {
  const { openPlayer } = usePlayerModal();
  const { autoLinkEvents } = useAutoLinkEvents();
  const [league, setLeague] = useState("nba");
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [events, setEvents] = useState<ESPNEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [leagueInfo, setLeagueInfo] = useState<{ name: string; sub: string; sport?: string }>({ name: "", sub: "" });
  const [eventLinks, setEventLinks] = useState<Map<string, { url1: string; url2?: string; url3?: string }>>(new Map());
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("fluxoFavEvents");
    return new Set(saved ? JSON.parse(saved) : []);
  });

  const fetchEventLinks = useCallback(async () => {
    const { data, error } = await supabase
      .from("events")
      .select("espn_id, stream_url, stream_url_2, stream_url_3, is_active")
      .eq("is_active", true)
      .not("espn_id", "is", null);

    if (!error && data) {
      const linksMap = new Map<string, { url1: string; url2?: string; url3?: string }>();
      data.forEach((event: EventLink) => {
        if (event.espn_id && event.stream_url) {
          linksMap.set(event.espn_id, {
            url1: event.stream_url,
            url2: event.stream_url_2 || undefined,
            url3: event.stream_url_3 || undefined,
          });
        }
      });
      setEventLinks(linksMap);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchESPNScoreboard(league);
      const fetchedEvents = data.events || [];
      setEvents(fetchedEvents);
      const lg = data.leagues?.[0];
      const info = {
        name: lg?.name || lg?.abbreviation || league,
        sub: lg?.abbreviation || "",
        sport: detectSportFromLeague(league),
      };
      setLeagueInfo(info);

      // Auto-asignar links a eventos detectados
      if (fetchedEvents.length > 0) {
        const result = await autoLinkEvents(fetchedEvents, info);
        if (result.linked > 0) {
          console.log(`🔗 Auto-linked ${result.linked} events`);
          // Refrescar los links después de auto-asignar
          fetchEventLinks();
        }
      }
    } catch {
      setEvents([]);
    }
    setLoading(false);
  }, [league, autoLinkEvents, fetchEventLinks]);

  useEffect(() => {
    fetchEventLinks();

    const channel = supabase
      .channel('events-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        () => {
          fetchEventLinks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEventLinks]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Auto-refresh scores every 30 seconds for live matches
  useEffect(() => {
    const hasLiveMatches = events.some(e => e.competitions?.[0]?.status?.type?.state === "in");
    
    // Always refresh scores periodically (every 30s if live matches, every 60s otherwise)
    const refreshInterval = hasLiveMatches ? 30000 : 60000;
    
    const interval = setInterval(() => {
      loadEvents();
      fetchEventLinks();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [events, loadEvents, fetchEventLinks]);

  const toggleFavorite = (eventId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      localStorage.setItem("fluxoFavEvents", JSON.stringify([...next]));
      return next;
    });
  };

  const filteredEvents = useMemo(() => {
    let list = events;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((e) => {
        const comp = e.competitions?.[0];
        const teams = comp?.competitors || [];
        return teams.some((t) =>
          (t.team?.displayName || "").toLowerCase().includes(q)
        );
      });
    }

    if (filter === "live") {
      list = list.filter((e) => e.competitions?.[0]?.status?.type?.state === "in");
    } else if (filter === "fav") {
      list = list.filter((e) => favorites.has(e.id));
    } else if (filter === "nolink") {
      list = list.filter((e) => !eventLinks.has(e.id));
    }

    const rank = (state: string) => (state === "in" ? 0 : state === "pre" ? 1 : 2);
    list.sort((a, b) => {
      const stateA = a.competitions?.[0]?.status?.type?.state || "";
      const stateB = b.competitions?.[0]?.status?.type?.state || "";
      return rank(stateA) - rank(stateB);
    });

    return list;
  }, [events, searchQuery, filter, favorites, eventLinks]);

  // Stats for the dashboard
  const stats = useMemo(() => {
    const liveEvents = events.filter(e => e.competitions?.[0]?.status?.type?.state === "in").length;
    const upcomingEvents = events.filter(e => e.competitions?.[0]?.status?.type?.state === "pre").length;
    const withLinks = events.filter(e => eventLinks.has(e.id)).length;
    return { totalEvents: events.length, liveEvents, upcomingEvents, withLinks };
  }, [events, eventLinks]);

  // Get featured match (first live event with link, or first event with link)
  const featuredEvent = useMemo(() => {
    const liveWithLink = events.find(e => 
      e.competitions?.[0]?.status?.type?.state === "in" && eventLinks.has(e.id)
    );
    if (liveWithLink) return liveWithLink;
    
    const anyWithLink = events.find(e => eventLinks.has(e.id));
    return anyWithLink;
  }, [events, eventLinks]);

  // Filter options with counts
  const filterOptionsWithCounts = useMemo(() => {
    return EVENT_FILTERS.map(f => ({
      ...f,
      count: f.value === "live" ? stats.liveEvents :
             f.value === "fav" ? favorites.size :
             f.value === "nolink" ? events.filter(e => !eventLinks.has(e.id)).length :
             undefined
    }));
  }, [stats.liveEvents, favorites.size, events, eventLinks]);

  const handleEventClick = (event: ESPNEvent) => {
    const link = eventLinks.get(event.id);
    const comp = event.competitions?.[0];
    const teams = comp?.competitors || [];
    const away = teams.find((c) => c.homeAway === "away") || teams[0];
    const home = teams.find((c) => c.homeAway === "home") || teams[1];
    const title = `${away?.team?.displayName || "Equipo"} vs ${home?.team?.displayName || "Equipo"}`;

    if (link) {
      openPlayer(title, link);
    }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "—";
    }
  };

  // Events without the featured one
  const eventsWithoutFeatured = useMemo(() => {
    if (!featuredEvent) return filteredEvents;
    return filteredEvents.filter(e => e.id !== featuredEvent.id);
  }, [filteredEvents, featuredEvent]);

  return (
    <Section
      title="Eventos"
      emoji="🏟️"
      badge={loading ? "Cargando…" : `${filteredEvents.length} eventos`}
    >
      {/* Premium header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-purple-500/30 border border-primary/30 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
              {leagueInfo.name || "Liga"}
              <Sparkles className="w-4 h-4 text-yellow-400" />
            </h2>
            <p className="text-sm text-white/50">Partidos en tiempo real</p>
          </div>
        </div>
      </div>

      {/* Stats dashboard */}
      <EventsStats 
        totalEvents={stats.totalEvents}
        liveEvents={stats.liveEvents}
        upcomingEvents={stats.upcomingEvents}
        withLinks={stats.withLinks}
      />

      {/* Info banner */}
      <EventInfoBanner />

      {/* Featured match */}
      {featuredEvent && !loading && (
        <FeaturedMatch
          event={featuredEvent}
          hasLink={eventLinks.has(featuredEvent.id)}
          onClick={() => handleEventClick(featuredEvent)}
        />
      )}

      {/* Premium filters */}
      <PremiumFilters
        league={league}
        onLeagueChange={setLeague}
        leagueOptions={LEAGUE_OPTIONS}
        filter={filter}
        onFilterChange={setFilter}
        filterOptions={filterOptionsWithCounts}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={() => { loadEvents(); fetchEventLinks(); }}
        isLoading={loading}
      />

      {/* Events grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonEventCard key={i} />
          ))}
        </div>
      ) : eventsWithoutFeatured.length === 0 ? (
        <div className="relative flex flex-col items-center justify-center py-16 gap-6 text-center">
          {/* Background glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />
          </div>
          
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center">
            <span className="text-4xl">🏟️</span>
          </div>
          <div className="relative">
            <p className="text-xl font-display font-bold text-white mb-2">Sin resultados</p>
            <p className="text-muted-foreground max-w-sm">
              No hay eventos que coincidan con los filtros seleccionados. Prueba a cambiar la liga o los filtros.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {eventsWithoutFeatured.map((event, index) => (
            <div 
              key={event.id} 
              className="animate-card-entrance"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <EventCard
                event={event}
                leagueInfo={leagueInfo}
                hasLink={eventLinks.has(event.id)}
                isFavorite={favorites.has(event.id)}
                isFeatured={false}
                onToggleFavorite={() => toggleFavorite(event.id)}
                onClick={() => handleEventClick(event)}
                formatTime={formatTime}
              />
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
