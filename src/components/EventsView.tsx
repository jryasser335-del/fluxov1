import { useState, useEffect, useMemo } from "react";
import { RefreshCw, Search, Heart } from "lucide-react";
import { fetchESPNScoreboard, ESPNEvent } from "@/lib/api";
import { LEAGUE_OPTIONS } from "@/lib/constants";
import { usePlayerModal } from "@/hooks/usePlayerModal";
import { Section } from "./Section";
import { Chips } from "./Chips";
import { Input } from "@/components/ui/input";
import { SkeletonEventCard } from "./Skeleton";

const EVENT_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "live", label: "En vivo" },
  { value: "fav", label: "Favoritos" },
  { value: "nolink", label: "Sin link" },
];

// Demo event links - in production these would come from a backend
const EVENT_LINKS: Record<string, string> = {};

export function EventsView() {
  const { openPlayer } = usePlayerModal();
  const [league, setLeague] = useState("nba");
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [events, setEvents] = useState<ESPNEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [leagueInfo, setLeagueInfo] = useState({ name: "", sub: "" });
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("fluxoFavEvents");
    return new Set(saved ? JSON.parse(saved) : []);
  });

  const loadEvents = async () => {
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
  };

  useEffect(() => {
    loadEvents();
  }, [league]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadEvents, 60000); // 1 minute
    return () => clearInterval(interval);
  }, [autoRefresh, league]);

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

    // Search filter
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

    // Type filter
    if (filter === "live") {
      list = list.filter((e) => e.competitions?.[0]?.status?.type?.state === "in");
    } else if (filter === "fav") {
      list = list.filter((e) => favorites.has(e.id));
    } else if (filter === "nolink") {
      list = list.filter((e) => !EVENT_LINKS[e.id]);
    }

    // Sort: live -> upcoming -> finished
    const rank = (state: string) => (state === "in" ? 0 : state === "pre" ? 1 : 2);
    list.sort((a, b) => {
      const stateA = a.competitions?.[0]?.status?.type?.state || "";
      const stateB = b.competitions?.[0]?.status?.type?.state || "";
      return rank(stateA) - rank(stateB);
    });

    return list;
  }, [events, searchQuery, filter, favorites]);

  const handleEventClick = (event: ESPNEvent) => {
    const link = EVENT_LINKS[event.id];
    const comp = event.competitions?.[0];
    const teams = comp?.competitors || [];
    const away = teams.find((c) => c.homeAway === "away") || teams[0];
    const home = teams.find((c) => c.homeAway === "home") || teams[1];
    const title = `${away?.team?.displayName || "Equipo"} vs ${home?.team?.displayName || "Equipo"}`;

    if (link) {
      openPlayer(title, link);
    } else {
      console.log(`No link for event: ${event.id}`);
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
      {/* League selector */}
      <div className="flex flex-wrap gap-2 items-center mb-3">
        <select
          value={league}
          onChange={(e) => setLeague(e.target.value)}
          className="h-10 rounded-full px-3 border border-white/10 bg-[#0b0b10] text-foreground outline-none"
        >
          {LEAGUE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#0b0b10]">
              {opt.label}
            </option>
          ))}
        </select>

        <button
          onClick={loadEvents}
          className="h-10 px-3 rounded-full border border-white/10 bg-white/[0.04] text-foreground hover:border-white/20 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Filters and search */}
      <div className="flex flex-wrap gap-3 items-center justify-between mb-3">
        <Chips options={EVENT_FILTERS} value={filter} onChange={setFilter} />

        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar equipo o evento..."
              className="pl-9 h-10 rounded-full border-white/10 bg-white/[0.05] w-56"
            />
          </div>

          <label className="flex gap-2 items-center px-3 py-2 rounded-full border border-white/10 bg-white/[0.04] text-sm text-white/80 cursor-pointer">
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

      {/* Events grid */}
      {loading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonEventCard key={i} />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-muted-foreground text-sm py-8 text-center">
          No hay resultados con ese filtro.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-3">
          {filteredEvents.map((event) => {
            const comp = event.competitions?.[0];
            const status = comp?.status?.type;
            const isLive = status?.state === "in";
            const isFinal = status?.state === "post";
            const competitors = comp?.competitors || [];
            const away = competitors.find((c) => c.homeAway === "away") || competitors[0];
            const home = competitors.find((c) => c.homeAway === "home") || competitors[1];
            const hasLink = !!EVENT_LINKS[event.id];
            const isFav = favorites.has(event.id);

            let clockTxt = "";
            if (isLive) {
              const period = comp?.status?.period ? `Q${comp.status.period}` : "";
              const clock = comp?.status?.displayClock || "";
              clockTxt = [period, clock].filter(Boolean).join(" • ");
            } else if (isFinal) {
              clockTxt = status?.shortDetail || "Final";
            } else {
              clockTxt = formatTime(comp?.date || event.date);
            }

            return (
              <div
                key={event.id}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-3.5 shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/30"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="text-xs font-bold tracking-wide">{leagueInfo.name}</div>
                    {leagueInfo.sub && (
                      <div className="text-muted-foreground text-[11px]">{leagueInfo.sub}</div>
                    )}
                  </div>
                  <div className="text-xs px-2.5 py-1.5 rounded-full border border-white/10 bg-black/25 flex items-center gap-2">
                    {isLive && <span className="w-2 h-2 rounded-full bg-destructive animate-pulse-glow" />}
                    {isLive ? "EN VIVO" : isFinal ? "FINAL" : "PRONTO"}
                  </div>
                </div>

                {/* Match */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-2.5 rounded-xl border border-white/[0.08] bg-black/30">
                  {/* Away team */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-11 h-11 rounded-xl border border-white/10 bg-white/[0.06] flex items-center justify-center overflow-hidden">
                      {away?.team?.logo ? (
                        <img
                          src={away.team.logo}
                          alt={away.team.displayName}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <span>🏷️</span>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-sm leading-tight">{away?.team?.shortDisplayName || "Equipo"}</div>
                      <div className="text-muted-foreground text-[11px]">{away?.team?.abbreviation}</div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="flex flex-col items-center min-w-[84px]">
                    <div className="font-display text-2xl tracking-wider">
                      {away?.score || "—"} <span className="opacity-55">:</span> {home?.score || "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">{clockTxt}</div>
                  </div>

                  {/* Home team */}
                  <div className="flex items-center gap-2.5 justify-end text-right">
                    <div>
                      <div className="font-bold text-sm leading-tight">{home?.team?.shortDisplayName || "Equipo"}</div>
                      <div className="text-muted-foreground text-[11px]">{home?.team?.abbreviation}</div>
                    </div>
                    <div className="w-11 h-11 rounded-xl border border-white/10 bg-white/[0.06] flex items-center justify-center overflow-hidden">
                      {home?.team?.logo ? (
                        <img
                          src={home.team.logo}
                          alt={home.team.displayName}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <span>🏷️</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center mt-2.5 gap-2">
                  <div className="text-xs text-muted-foreground">
                    {formatTime(comp?.date || event.date)}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleFavorite(event.id)}
                      className={`h-9 px-3 rounded-full border text-sm transition-all duration-150 hover:-translate-y-0.5 ${
                        isFav ? "border-destructive/40 bg-destructive/10" : "border-white/10 bg-white/[0.05]"
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isFav ? "fill-destructive text-destructive" : ""}`} />
                    </button>
                    <button
                      onClick={() => handleEventClick(event)}
                      className={`h-9 px-3 rounded-full border text-sm transition-all duration-150 hover:-translate-y-0.5 ${
                        hasLink ? "border-primary/35 bg-primary/15" : "border-white/10 bg-white/[0.05]"
                      }`}
                    >
                      {hasLink ? "Ver" : "Sin link"}
                    </button>
                  </div>
                </div>

                {/* Event ID for debugging */}
                <div className="mt-2 text-[11px] text-white/40 font-mono select-text">
                  ID: {event.id}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}
