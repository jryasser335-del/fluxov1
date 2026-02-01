import { useState, useEffect, useMemo, useCallback } from "react";
import { RefreshCw, Search } from "lucide-react";
import { fetchESPNScoreboard, ESPNEvent } from "@/lib/api";
import { LEAGUE_OPTIONS } from "@/lib/constants";
import { usePlayerModal } from "@/hooks/usePlayerModal";
import { supabase } from "@/integrations/supabase/client";
import { Section } from "./Section";
import { Chips } from "./Chips";
import { Input } from "@/components/ui/input";
import { EventCard } from "./events/EventCard";
import { SkeletonEventCard } from "./Skeleton";

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
  const [league, setLeague] = useState("nba");
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [events, setEvents] = useState<ESPNEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [leagueInfo, setLeagueInfo] = useState({ name: "", sub: "" });
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
      setEvents(data.events || []);
      const lg = data.leagues?.[0];
      setLeagueInfo({
        name: lg?.name || lg?.abbreviation || league,
        sub: lg?.abbreviation || "",
      });
    } catch {
      setEvents([]);
    }
    setLoading(false);
  }, [league]);

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

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadEvents();
      fetchEventLinks();
    }, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadEvents, fetchEventLinks]);

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

  return (
    <Section
      title="Eventos"
      emoji="🏟️"
      badge={loading ? "Cargando…" : `${filteredEvents.length} eventos`}
    >
      {/* Controls */}
      <div className="flex flex-col gap-3 mb-4">
        {/* League selector and refresh */}
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={league}
            onChange={(e) => setLeague(e.target.value)}
            className="h-10 rounded-xl px-3 border border-white/10 bg-white/[0.04] text-foreground outline-none focus:border-primary/40 transition-colors"
          >
            {LEAGUE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-background">
                {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => { loadEvents(); fetchEventLinks(); }}
            className="h-10 px-4 rounded-xl border border-white/10 bg-white/[0.04] text-foreground hover:border-primary/30 hover:bg-white/[0.06] flex items-center gap-2 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>

        {/* Filters and search */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <Chips options={EVENT_FILTERS} value={filter} onChange={setFilter} />

          <div className="flex gap-2 items-center w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar equipo..."
                className="pl-9 h-10 rounded-xl border-white/10 bg-white/[0.04] w-full sm:w-52"
              />
            </div>

            <label className="flex gap-2 items-center px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-sm text-foreground/80 cursor-pointer hover:border-white/20 transition-colors whitespace-nowrap">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="accent-primary"
              />
              Auto
            </label>
          </div>
        </div>
      </div>

      {/* Events grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonEventCard key={i} />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted border border-white/10 flex items-center justify-center text-2xl">
            🏟️
          </div>
          <div>
            <p className="text-foreground font-medium mb-1">Sin resultados</p>
            <p className="text-muted-foreground text-sm">No hay eventos con ese filtro.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              leagueInfo={leagueInfo}
              hasLink={eventLinks.has(event.id)}
              isFavorite={favorites.has(event.id)}
              onToggleFavorite={() => toggleFavorite(event.id)}
              onClick={() => handleEventClick(event)}
              formatTime={formatTime}
            />
          ))}
        </div>
      )}
    </Section>
  );
}
