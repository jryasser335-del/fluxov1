import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { fetchESPNScoreboard, ESPNEvent, ESPNResponse } from "@/lib/api";
import { LEAGUE_OPTIONS } from "@/lib/constants";
import { usePlayerModal } from "@/hooks/usePlayerModal";
import { supabase } from "@/integrations/supabase/client";
import { EventCard } from "./events/EventCard";
import { SkeletonEventCard } from "./Skeleton";
import { Search, RefreshCw, Sparkles, Eye, Play, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import fluxoLogo from "@/assets/fluxotv-logo.png";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// ── Caché localStorage (5 minutos) ───────────────────────────────────────────
const CACHE_KEY = "fluxo_streams_cache";
const CACHE_TTL = 5 * 60 * 1000;

function readStreamCache(): ExternalStream[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { streams, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return streams as ExternalStream[];
  } catch {
    return null;
  }
}

function writeStreamCache(streams: ExternalStream[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ streams, ts: Date.now() }));
  } catch {}
}

const SPORT_TABS = [
  {
    value: "football",
    label: "Football",
    emoji: "⚽",
    leagues: [
      "eng.1",
      "esp.1",
      "ger.1",
      "ita.1",
      "fra.1",
      "uefa.champions",
      "uefa.europa",
      "esp.copa_del_rey",
      "eng.fa",
      "eng.league_cup",
      "ger.dfb_pokal",
      "ita.coppa_italia",
      "fra.coupe_de_france",
      "ned.1",
      "por.1",
      "tur.1",
      "mex.1",
      "arg.1",
      "bra.1",
      "conmebol.libertadores",
      "mls",
    ],
  },
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
    const sName = s.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    const homeMatch = [homeName, homeShort].some((n) => n.length > 2 && sName.includes(n));
    const awayMatch = [awayName, awayShort].some((n) => n.length > 2 && sName.includes(n));
    const score = (homeMatch ? 1 : 0) + (awayMatch ? 1 : 0);
    if (score >= 1) scored.push({ stream: s, score });
  }
  scored.sort((a, b) => b.score - a.score);
  const result: ExternalStream[] = [];
  const usedSources = new Set<string>();
  for (const { stream } of scored) {
    if (result.length >= 3) break;
    if (!usedSources.has(stream.source)) {
      result.push(stream);
      usedSources.add(stream.source);
    }
  }
  return result;
}

const normalizeText = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const LEAGUE_LOGO_FALLBACKS: Record<string, string> = {
  "eng.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/23.png",
  "esp.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/15.png",
  "ger.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/10.png",
  "ita.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/12.png",
  "fra.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/9.png",
  "uefa.champions": "https://a.espncdn.com/i/leaguelogos/soccer/500/2.png",
  "uefa.europa": "https://a.espncdn.com/i/leaguelogos/soccer/500/2310.png",
};

const getLeagueLogoFallback = (k: string) => LEAGUE_LOGO_FALLBACKS[k] || "";

export function EventsView() {
  const { openPlayer } = usePlayerModal();
  const [activeSport, setActiveSport] = useState("football");
  const [activeLeagueFilter, setActiveLeagueFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [allEnrichedEvents, setAllEnrichedEvents] = useState<EnrichedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const [dbEvents, setDbEvents] = useState<DbEvent[]>([]);
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());
  const [externalStreams, setExternalStreams] = useState<ExternalStream[]>(() => readStreamCache() || []);
  const [externalStreamsLoaded, setExternalStreamsLoaded] = useState(() => readStreamCache() !== null);
  const persistedRef = useRef(new Set<string>());
  const refreshInFlightRef = useRef(false);

  const fetchEventLinks = useCallback(async () => {
    const { data, error } = await supabase
      .from("events")
      .select(
        "espn_id,name,team_home,team_away,stream_url,stream_url_2,stream_url_3,pending_url,is_active,sport,league,is_live,event_date",
      )
      .eq("is_active", true);
    if (!error && data) setDbEvents(data as DbEvent[]);
  }, []);

  const fetchExternalStreams = useCallback(async (force = false) => {
    if (!force && readStreamCache()) {
      setExternalStreams(readStreamCache()!);
      setExternalStreamsLoaded(true);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("fetch-all-streams", { body: {} });
      if (!error && data?.streams?.length > 0) {
        const streams = data.streams as ExternalStream[];
        setExternalStreams(streams);
        writeStreamCache(streams);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setExternalStreamsLoaded(true);
    }
  }, []);

  const leaguesToFetch = useMemo(() => SPORT_TABS.find((t) => t.value === activeSport)?.leagues || [], [activeSport]);

  const loadAllEvents = useCallback(
    async (isRefresh = false) => {
      if (isRefresh && refreshInFlightRef.current) return;
      if (!leaguesToFetch.length) {
        setAllEnrichedEvents([]);
        setLoading(false);
        setHasInitialLoad(true);
        return;
      }
      if (!isRefresh && !hasInitialLoad) setLoading(true);
      if (isRefresh) refreshInFlightRef.current = true;
      try {
        const results = await Promise.allSettled(
          leaguesToFetch.map(async (leagueKey) => {
            const data = await fetchESPNScoreboard(leagueKey);
            const lg = data.leagues?.[0];
            return (data.events || []).map((event) => ({
              event,
              leagueKey,
              leagueName: lg?.name || lg?.abbreviation || leagueKey,
              leagueSub: lg?.abbreviation || leagueKey.toUpperCase(),
              leagueLogo: lg?.logos?.[0]?.href || getLeagueLogoFallback(leagueKey),
            }));
          }),
        );
        const enriched: EnrichedEvent[] = [];
        const seenIds = new Set<string>();
        for (const r of results) {
          if (r.status === "fulfilled") {
            for (const item of r.value) {
              if (!seenIds.has(item.event.id)) {
                seenIds.add(item.event.id);
                enriched.push(item);
              }
            }
          }
        }
        setAllEnrichedEvents(enriched);
      } catch {
        if (!isRefresh) setAllEnrichedEvents([]);
      } finally {
        setLoading(false);
        setHasInitialLoad(true);
        if (isRefresh) refreshInFlightRef.current = false;
      }
    },
    [leaguesToFetch, hasInitialLoad],
  );

  const eventLinks = useMemo(() => {
    const map = new Map<string, { url1: string; url2?: string; url3?: string; viewers?: number }>();
    for (const { event: e } of allEnrichedEvents) {
      const byId = dbEvents.find((d) => d.espn_id === e.id);
      if (byId?.stream_url) {
        map.set(e.id, {
          url1: byId.stream_url,
          url2: byId.stream_url_2 || undefined,
          url3: byId.stream_url_3 || undefined,
        });
        continue;
      }
      const comp = e.competitions?.[0];
      const competitors = comp?.competitors || [];
      const home = competitors.find((c) => c.homeAway === "home");
      const away = competitors.find((c) => c.homeAway === "away");
      if (externalStreams.length > 0) {
        const ext = findBestExternalMatches(
          externalStreams,
          normalizeText(home?.team?.displayName || ""),
          normalizeText(away?.team?.displayName || ""),
          normalizeText(home?.team?.shortDisplayName || ""),
          normalizeText(away?.team?.shortDisplayName || ""),
        );
        if (ext.length > 0)
          map.set(e.id, { url1: ext[0].iframe, url2: ext[1]?.iframe, url3: ext[2]?.iframe, viewers: ext[0].viewers });
      }
    }
    return map;
  }, [dbEvents, allEnrichedEvents, externalStreams]);

  useEffect(() => {
    fetchEventLinks();
    fetchExternalStreams();
    loadAllEvents();
  }, [fetchEventLinks, fetchExternalStreams, loadAllEvents]);

  const filteredEvents = useMemo(() => {
    let list = [...allEnrichedEvents];
    if (activeLeagueFilter) list = list.filter((e) => e.leagueKey === activeLeagueFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        ({ event: e }) =>
          (e.name || "").toLowerCase().includes(q) ||
          (e.competitions?.[0]?.competitors || []).some((t) => t.team?.displayName?.toLowerCase().includes(q)),
      );
    }
    const rank = (s: string) => (s === "in" ? 0 : s === "pre" ? 1 : 2);
    list.sort(
      (a, b) =>
        rank(a.event.competitions?.[0]?.status?.type?.state || "") -
        rank(b.event.competitions?.[0]?.status?.type?.state || ""),
    );
    return list;
  }, [allEnrichedEvents, activeLeagueFilter, searchQuery]);

  const handleEventClick = useCallback(
    async (enriched: EnrichedEvent) => {
      const comp = enriched.event.competitions?.[0];
      if (comp?.status?.type?.state === "post") return;
      const title = `${comp?.competitors?.find((c) => c.homeAway === "away")?.team?.displayName || "TBD"} vs ${comp?.competitors?.find((c) => c.homeAway === "home")?.team?.displayName || "TBD"}`;
      const link = eventLinks.get(enriched.event.id);
      if (link?.url1) {
        openPlayer(title, link, "live");
        return;
      }
      toast.error("Buscando enlace en tiempo real...");
    },
    [eventLinks, openPlayer],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={fluxoLogo} alt="Logo" className="w-10 h-10 rounded-xl shadow-lg" />
          <h1 className="text-2xl font-display tracking-tight text-white">
            FLUXO<span className="gradient-text text-primary">TV</span>
          </h1>
        </div>
        <div className="relative w-full sm:max-w-xs group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Buscar eventos..."
            className="bg-white/5 border-white/10 pl-10 h-11 rounded-2xl focus:ring-primary/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Sport Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {SPORT_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveSport(tab.value)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all shrink-0",
              activeSport === tab.value
                ? "bg-primary text-white shadow-lg shadow-primary/25"
                : "bg-white/5 text-white/40 hover:bg-white/10",
            )}
          >
            <span>{tab.emoji}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Grid Corregido */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonEventCard key={i} />)
          ) : filteredEvents.length > 0 ? (
            filteredEvents.map((item) => (
              <motion.div
                key={item.event.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                {/* He pasado los datos uno a uno para evitar el error TS2322 */}
                <EventCard
                  event={item.event}
                  leagueKey={item.leagueKey}
                  leagueName={item.leagueName}
                  leagueSub={item.leagueSub}
                  leagueLogo={item.leagueLogo}
                  hasLink={eventLinks.has(item.event.id)}
                  onClick={() => handleEventClick(item)}
                  isResolving={resolvingIds.has(item.event.id)}
                />
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center text-white/20">No se encontraron eventos activos</div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
