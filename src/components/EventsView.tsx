import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { fetchESPNScoreboard, ESPNEvent, ESPNResponse } from "@/lib/api";
import { LEAGUE_OPTIONS } from "@/lib/constants";
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
  } catch {
    /* localStorage lleno */
  }
}
// ─────────────────────────────────────────────────────────────────────────────

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
  for (const { stream } of scored) {
    if (result.length >= 3) break;
    if (!result.includes(stream)) result.push(stream);
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
  "bra.1": ["brasileirao"],
  mls: ["mls", "major league soccer"],
  "conmebol.libertadores": ["libertadores", "copa libertadores"],
};

const getLeagueLogoFallback = (k: string) => LEAGUE_LOGO_FALLBACKS[k] || "";

// ── Hero Banner ───────────────────────────────────────────────────────────────
function HeroBanner({
  enriched,
  viewers,
  hasLink,
  onClick,
}: {
  enriched: EnrichedEvent;
  viewers: number;
  hasLink: boolean;
  onClick: () => void;
}) {
  const comp = enriched.event.competitions?.[0];
  const competitors = comp?.competitors || [];
  const away = competitors.find((c) => c.homeAway === "away") || competitors[0];
  const home = competitors.find((c) => c.homeAway === "home") || competitors[1];
  const awayScore = away?.score;
  const homeScore = home?.score;
  const timeText = [comp?.status?.period ? `Q${comp.status.period}` : "", comp?.status?.displayClock || ""]
    .filter(Boolean)
    .join(" · ");
  const awayColor = away?.team?.color ? `#${away.team.color}` : "#1a3a5c";
  const homeColor = home?.team?.color ? `#${home.team.color}` : "#5c1a3a";

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative mb-6 rounded-2xl overflow-hidden cursor-pointer group"
      onClick={onClick}
      style={{
        background: `linear-gradient(135deg, ${awayColor}cc 0%, ${awayColor}44 35%, #0d1220 55%, ${homeColor}44 75%, ${homeColor}cc 100%)`,
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,_rgba(255,255,255,0.07)_0%,_transparent_55%)] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
      <div className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/15 via-transparent to-primary-glow/10 pointer-events-none" />
      <div className="relative px-5 py-5 sm:px-8 sm:py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/90 border border-white/[0.12] shadow-lg shadow-destructive/30">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
              </span>
              <span className="text-[10px] font-black text-white tracking-[0.2em]">LIVE</span>
            </div>
            <span className="text-[11px] font-semibold text-white/50 tracking-wide">{enriched.leagueName}</span>
          </div>
          {viewers > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/30 backdrop-blur-sm border border-white/[0.06]">
              <Eye className="w-3 h-3 text-white/40" />
              <span className="text-[10px] font-medium text-white/55 tabular-nums">{viewers.toLocaleString()}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-center gap-6 sm:gap-12">
          {[
            { team: away, score: awayScore },
            { team: home, score: homeScore },
          ]
            .map((side, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1">
                {side.team?.team?.logo ? (
                  <div className="relative">
                    <div className="absolute inset-0 blur-2xl opacity-50 scale-[2]">
                      <img src={side.team.team.logo} alt="" className="w-full h-full object-contain" />
                    </div>
                    <img
                      src={side.team.team.logo}
                      alt={side.team.team.displayName}
                      className="relative w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.8)]"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/[0.08] border border-white/[0.1] flex items-center justify-center text-white/60 font-bold text-lg">
                    {(side.team?.team?.abbreviation || "?").slice(0, 3)}
                  </div>
                )}
                <span className="text-sm sm:text-base font-bold text-white/90 text-center leading-tight max-w-[100px] sm:max-w-[140px] line-clamp-2">
                  {side.team?.team?.shortDisplayName || side.team?.team?.displayName || "TBD"}
                </span>
              </div>
            ))
            .reduce(
              (acc, el, i) =>
                i === 0
                  ? [
                      el,
                      <div key="score" className="flex flex-col items-center gap-1.5 flex-shrink-0">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <span className="font-display text-4xl sm:text-5xl text-white font-bold tracking-wider drop-shadow-[0_0_24px_rgba(255,255,255,0.2)]">
                            {awayScore ?? "–"}
                          </span>
                          <span className="text-xl text-white/15 font-bold">:</span>
                          <span className="font-display text-4xl sm:text-5xl text-white font-bold tracking-wider drop-shadow-[0_0_24px_rgba(255,255,255,0.2)]">
                            {homeScore ?? "–"}
                          </span>
                        </div>
                        {timeText && (
                          <span className="text-[10px] font-mono-premium text-primary/80 font-semibold tracking-widest uppercase">
                            {timeText}
                          </span>
                        )}
                      </div>,
                    ]
                  : [...acc, el],
              [] as React.ReactNode[],
            )}
        </div>
        {hasLink && (
          <div className="flex justify-center mt-5">
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/90 hover:bg-primary transition-all duration-200 border border-white/[0.15] shadow-lg shadow-primary/30 group-hover:scale-105">
              <Play className="w-4 h-4 text-white fill-white" />
              <span className="text-sm font-bold text-white tracking-wide">Ver en vivo</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function EventsView() {
  const { openPlayer, isOpen } = usePlayerModal();
  const [activeSport, setActiveSport] = useState("football");
  const [activeLeagueFilter, setActiveLeagueFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [allEnrichedEvents, setAllEnrichedEvents] = useState<EnrichedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const [dbEvents, setDbEvents] = useState<DbEvent[]>([]);
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());

  // Streams: inicia desde caché si existe
  const [externalStreams, setExternalStreams] = useState<ExternalStream[]>(() => readStreamCache() || []);
  const [externalStreamsLoaded, setExternalStreamsLoaded] = useState(() => readStreamCache() !== null);
  const [streamsLoadingBg, setStreamsLoadingBg] = useState(false);

  const refreshInFlightRef = useRef(false);
  const persistedRef = useRef(new Set<string>());
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("fluxoFavEvents") || "[]"));
    } catch {
      return new Set();
    }
  });

  const fetchEventLinks = useCallback(async () => {
    const { data, error } = await supabase
      .from("events")
      .select(
        "espn_id,name,team_home,team_away,stream_url,stream_url_2,stream_url_3,pending_url,is_active,sport,league,is_live,event_date",
      )
      .eq("is_active", true);
    if (!error && data) setDbEvents(data as DbEvent[]);
  }, []);

  // Fetch streams en background sin bloquear UI — guarda en localStorage
  const fetchExternalStreams = useCallback(async (force = false) => {
    if (!force) {
      const cached = readStreamCache();
      if (cached) {
        setExternalStreams(cached);
        setExternalStreamsLoaded(true);
        return;
      }
    }
    setStreamsLoadingBg(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-all-streams", { body: {} });
      if (!error && data?.streams?.length > 0) {
        const streams = data.streams as ExternalStream[];
        setExternalStreams(streams);
        writeStreamCache(streams);
        console.log(`📡 Streams cacheados: ${streams.length}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setExternalStreamsLoaded(true);
      setStreamsLoadingBg(false);
    }
  }, []);

  const leaguesToFetch = useMemo(() => SPORT_TABS.find((t) => t.value === activeSport)?.leagues || [], [activeSport]);
  const currentTab = SPORT_TABS.find((t) => t.value === activeSport);
  const availableLeagues = useMemo(
    () => LEAGUE_OPTIONS.filter((l) => currentTab?.leagues?.includes(l.value)),
    [currentTab],
  );

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
        for (const r of results)
          if (r.status === "fulfilled")
            for (const item of r.value)
              if (!seenIds.has(item.event.id)) {
                seenIds.add(item.event.id);
                enriched.push(item);
              }
        if (enriched.length > 0 || !isRefresh || !hasInitialLoad) setAllEnrichedEvents(enriched);
      } catch {
        if (!isRefresh) setAllEnrichedEvents([]);
      } finally {
        if (!hasInitialLoad) setHasInitialLoad(true);
        setLoading(false);
        if (isRefresh) refreshInFlightRef.current = false;
      }
    },
    [leaguesToFetch, hasInitialLoad],
  );

  const eventLinks = useMemo(() => {
    const map = new Map<string, { url1: string; url2?: string; url3?: string; viewers?: number }>();
    for (const { event: e } of allEnrichedEvents) {
      const byId = dbEvents.find((d) => d.espn_id && d.espn_id === e.id);
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
      const espnHome = competitors.find((c) => c.homeAway === "home");
      const espnAway = competitors.find((c) => c.homeAway === "away");
      if (!espnHome?.team?.displayName && !espnAway?.team?.displayName) continue;
      const homeName = normalizeText(espnHome?.team?.displayName || "");
      const awayName = normalizeText(espnAway?.team?.displayName || "");
      const homeShort = normalizeText(espnHome?.team?.shortDisplayName || "");
      const awayShort = normalizeText(espnAway?.team?.shortDisplayName || "");
      const dbMatch = dbEvents.find((d) => {
        if (!d.stream_url) return false;
        const dAll = normalizeText(`${d.name || ""} ${d.team_home || ""} ${d.team_away || ""}`);
        return (
          [homeName, homeShort].some((n) => n.length > 2 && dAll.includes(n)) &&
          [awayName, awayShort].some((n) => n.length > 2 && dAll.includes(n))
        );
      });
      if (dbMatch?.stream_url) {
        map.set(e.id, {
          url1: dbMatch.stream_url,
          url2: dbMatch.stream_url_2 || undefined,
          url3: dbMatch.stream_url_3 || undefined,
        });
        continue;
      }
      if (externalStreams.length > 0) {
        const ext = findBestExternalMatches(externalStreams, homeName, awayName, homeShort, awayShort);
        if (ext.length > 0)
          map.set(e.id, {
            url1: ext[0].iframe,
            url2: ext[1]?.iframe,
            url3: ext[2]?.iframe,
            viewers: ext[0].viewers || 0,
          });
      }
    }
    return map;
  }, [dbEvents, allEnrichedEvents, externalStreams]);

  useEffect(() => {
    if (!externalStreamsLoaded || !externalStreams.length) return;
    const toPersist: any[] = [];
    for (const { event: e, leagueKey } of allEnrichedEvents) {
      if (persistedRef.current.has(e.id)) continue;
      const inDb = dbEvents.find((d) => d.espn_id === e.id);
      if (inDb?.stream_url) {
        persistedRef.current.add(e.id);
        continue;
      }
      const link = eventLinks.get(e.id);
      if (!link?.url1) continue;
      if (dbEvents.find((d) => d.stream_url === link.url1)) {
        persistedRef.current.add(e.id);
        continue;
      }
      const comp = e.competitions?.[0];
      const competitors = comp?.competitors || [];
      const home = competitors.find((c) => c.homeAway === "home");
      const away = competitors.find((c) => c.homeAway === "away");
      toPersist.push({
        espnId: e.id,
        title: `${away?.team?.displayName || "TBD"} vs ${home?.team?.displayName || "TBD"}`,
        home: home?.team?.displayName || "",
        away: away?.team?.displayName || "",
        sport: leagueKey.includes("nba")
          ? "Basketball"
          : leagueKey.includes("nhl")
            ? "Hockey"
            : leagueKey.includes("mlb")
              ? "Baseball"
              : "Soccer",
        league: leagueKey,
        date: comp?.date || e.date,
        url1: link.url1,
        url2: link.url2,
        url3: link.url3,
      });
    }
    if (!toPersist.length) return;
    (async () => {
      let saved = 0;
      for (const p of toPersist) {
        if (persistedRef.current.has(p.espnId)) continue;
        const { data: existing } = await supabase.from("events").select("id").eq("espn_id", p.espnId).maybeSingle();
        const payload = {
          stream_url: p.url1,
          stream_url_2: p.url2 || null,
          stream_url_3: p.url3 || null,
          pending_url: p.url1,
          is_active: true,
          is_live: true,
        };
        if (existing) await supabase.from("events").update(payload).eq("id", existing.id);
        else
          await supabase
            .from("events")
            .insert({
              ...payload,
              espn_id: p.espnId,
              name: p.title,
              team_home: p.home,
              team_away: p.away,
              sport: p.sport,
              league: p.league,
              event_date: p.date,
            });
        persistedRef.current.add(p.espnId);
        saved++;
      }
      if (saved > 0) {
        console.log(`💾 ${saved} links persistidos`);
        fetchEventLinks();
      }
    })();
  }, [eventLinks, externalStreamsLoaded, externalStreams, allEnrichedEvents, dbEvents, fetchEventLinks]);

  useEffect(() => {
    fetchEventLinks();
    fetchExternalStreams(); // Usa caché si hay, sino fetch en background
    const ch = supabase
      .channel("events-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, fetchEventLinks)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [fetchEventLinks, fetchExternalStreams]);

  useEffect(() => {
    loadAllEvents();
  }, [loadAllEvents]);

  useEffect(() => {
    const hasLive = allEnrichedEvents.some((e) => e.event.competitions?.[0]?.status?.type?.state === "in");
    const iv = setInterval(
      () => {
        loadAllEvents(true);
        fetchEventLinks();
        if (!readStreamCache()) fetchExternalStreams(true); // solo si expiró caché
      },
      hasLive ? 30000 : 60000,
    );
    return () => clearInterval(iv);
  }, [allEnrichedEvents, loadAllEvents, fetchEventLinks, fetchExternalStreams]);

  useEffect(() => {
    setActiveLeagueFilter(null);
  }, [activeSport]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem("fluxoFavEvents", JSON.stringify([...next]));
      return next;
    });
  };

  // ── Click INMEDIATO: abre al instante si hay link, sino espera hasta 20s ──
  const handleEventClick = useCallback(
    async (enriched: EnrichedEvent) => {
      const comp = enriched.event.competitions?.[0];
      const status = comp?.status?.type;
      if (status?.state === "post") return;
      const teams = comp?.competitors || [];
      const away = teams.find((c) => c.homeAway === "away") || teams[0];
      const home = teams.find((c) => c.homeAway === "home") || teams[1];
      const title = `${away?.team?.displayName || "Equipo"} vs ${home?.team?.displayName || "Equipo"}`;

      // Si ya tenemos el link → abrir inmediatamente
      const existingLink = eventLinks.get(enriched.event.id);
      if (existingLink?.url1) {
        openPlayer(title, existingLink, "live");
        return;
      }

      // Sin link aún → spinner en tarjeta + esperar hasta 20s
      setResolvingIds((prev) => new Set(prev).add(enriched.event.id));
      toast("Buscando enlace...", { duration: 3000 });

      const deadline = Date.now() + 20_000;
      const homeName = normalizeText(home?.team?.displayName || "");
      const awayName = normalizeText(away?.team?.displayName || "");
      const homeShort = normalizeText(home?.team?.shortDisplayName || "");
      const awayShort = normalizeText(away?.team?.shortDisplayName || "");

      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 1500));
        // Comprobar DB
        const { data: fresh } = await supabase
          .from("events")
          .select("stream_url,stream_url_2,stream_url_3")
          .eq("espn_id", enriched.event.id)
          .maybeSingle();
        if (fresh?.stream_url) {
          setResolvingIds((prev) => {
            const s = new Set(prev);
            s.delete(enriched.event.id);
            return s;
          });
          openPlayer(
            title,
            { url1: fresh.stream_url, url2: fresh.stream_url_2 || undefined, url3: fresh.stream_url_3 || undefined },
            "live",
          );
          return;
        }
        // Comprobar streams en memoria (pueden haber llegado en background)
        const current = readStreamCache();
        if (current?.length) {
          const ext = findBestExternalMatches(current, homeName, awayName, homeShort, awayShort);
          if (ext.length > 0) {
            setResolvingIds((prev) => {
              const s = new Set(prev);
              s.delete(enriched.event.id);
              return s;
            });
            openPlayer(title, { url1: ext[0].iframe, url2: ext[1]?.iframe, url3: ext[2]?.iframe }, "live");
            return;
          }
        }
      }
      setResolvingIds((prev) => {
        const s = new Set(prev);
        s.delete(enriched.event.id);
        return s;
      });
      toast.error("No hay enlace disponible para este partido", { duration: 4000 });
    },
    [eventLinks, openPlayer],
  );

  const handleDbEventClick = (event: DbEvent) => {
    if (!event.stream_url) return;
    openPlayer(`${event.team_home || "Team"} vs ${event.team_away || "Team"}`, {
      url1: event.stream_url,
      url2: event.stream_url_2 || undefined,
      url3: event.stream_url_3 || undefined,
    });
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "—";
    }
  };

  const dbOnlyEvents = useMemo(() => {
    const sportMap: Record<string, { sports: string[]; leagues?: string[] }> = {
      nba: { sports: ["basketball"], leagues: ["nba"] },
      mlb: { sports: ["baseball"], leagues: ["mlb", "world baseball classic", "wbc", "clasico mundial"] },
      nhl: { sports: ["hockey"], leagues: ["nhl"] },
      football: {
        sports: ["soccer", "football"],
        leagues: [
          "premier",
          "laliga",
          "la liga",
          "bundesliga",
          "serie a",
          "ligue 1",
          "champions",
          "europa",
          "copa del rey",
          "fa cup",
          "carabao",
          "efl",
          "dfb",
          "coppa italia",
          "coupe de france",
          "eredivisie",
          "liga portugal",
          "super lig",
          "liga mx",
          "argentina",
          "brasileirao",
          "libertadores",
          "mls",
        ],
      },
      boxing: { sports: ["boxing"] },
      mma: { sports: ["mma", "ufc"] },
      wrestling: { sports: ["wrestling", "wwe"] },
    };
    const q = normalizeText(searchQuery);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return dbEvents.filter((d) => {
      if (!d.stream_url) return false;
      if (d.event_date && d.event_date.slice(0, 10) !== todayStr) return false;
      const cfg = sportMap[activeSport];
      if (!cfg) return false;
      const eSport = normalizeText(d.sport || "");
      const eLeague = normalizeText(d.league || "");
      const eName = normalizeText(d.name || "");
      if (!cfg.sports.some((s) => eSport.includes(s))) return false;
      if (cfg.leagues && !cfg.leagues.some((l) => `${eLeague} ${eName}`.includes(l))) return false;
      if (activeLeagueFilter) {
        const aliases = DB_LEAGUE_ALIASES[activeLeagueFilter] || [
          normalizeText(activeLeagueFilter.replace(/\./g, " ")),
        ];
        if (!aliases.some((a) => `${eLeague} ${eName}`.includes(a))) return false;
      }
      if (q) {
        const hay = normalizeText(`${d.name || ""} ${d.team_home || ""} ${d.team_away || ""} ${d.league || ""}`);
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [dbEvents, activeSport, activeLeagueFilter, searchQuery]);

  const filteredEvents = useMemo(() => {
    let list = [...allEnrichedEvents];
    if (activeLeagueFilter) list = list.filter((e) => e.leagueKey === activeLeagueFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(({ event: e }) => {
        const teams = e.competitions?.[0]?.competitors || [];
        return (
          teams.some((t) => (t.team?.displayName || "").toLowerCase().includes(q)) || e.name?.toLowerCase().includes(q)
        );
      });
    }
    const rank = (s: string) => (s === "in" ? 0 : s === "pre" ? 1 : 2);
    list.sort(
      (a, b) =>
        rank(a.event.competitions?.[0]?.status?.type?.state || "") -
        rank(b.event.competitions?.[0]?.status?.type?.state || ""),
    );
    return list;
  }, [allEnrichedEvents, activeLeagueFilter, searchQuery]);

  const stats = useMemo(
    () => ({
      total: filteredEvents.length,
      live: filteredEvents.filter((e) => e.event.competitions?.[0]?.status?.type?.state === "in").length,
      withLinks: filteredEvents.filter((e) => eventLinks.has(e.event.id)).length,
    }),
    [filteredEvents, eventLinks],
  );
  const leagueCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of allEnrichedEvents) m.set(e.leagueKey, (m.get(e.leagueKey) || 0) + 1);
    return m;
  }, [allEnrichedEvents]);
  const featuredLiveEvent = useMemo(() => {
    const live = filteredEvents.filter((e) => e.event.competitions?.[0]?.status?.type?.state === "in");
    if (!live.length) return null;
    return live.find((e) => eventLinks.has(e.event.id)) || live[0];
  }, [filteredEvents, eventLinks]);
  const featuredViewers = useMemo(() => {
    if (!featuredLiveEvent) return 0;
    return eventLinks.get(featuredLiveEvent.event.id)?.viewers || Math.floor(Math.random() * 12000) + 3000;
  }, [featuredLiveEvent, eventLinks]);
  const gridEvents = useMemo(
    () =>
      featuredLiveEvent ? filteredEvents.filter((e) => e.event.id !== featuredLiveEvent.event.id) : filteredEvents,
    [filteredEvents, featuredLiveEvent],
  );

  return (
    <div className="space-y-0">
      <div className="relative mb-6">
        <div className="relative flex items-center justify-between gap-3 mb-6">
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
                placeholder="Buscar..."
                className="pl-10 h-11 rounded-2xl border-white/[0.04] bg-white/[0.025] hover:bg-white/[0.04] focus:bg-white/[0.04] focus:ring-1 focus:ring-primary/20 focus:border-primary/15 transition-all duration-300 placeholder:text-muted-foreground/25 text-sm backdrop-blur-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {streamsLoadingBg && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.04]">
                <Loader2 className="w-3.5 h-3.5 text-primary/50 animate-spin" />
                <span className="text-[10px] text-muted-foreground/30 hidden sm:inline">Cargando enlaces...</span>
              </div>
            )}
            {stats.live > 0 && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-primary/[0.08] border border-primary/[0.12] backdrop-blur-sm"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="text-xs font-bold text-primary tabular-nums">{stats.live}</span>
                <span className="text-[10px] text-primary/60 font-medium hidden sm:inline">LIVE</span>
              </motion.div>
            )}
            <button
              onClick={() => {
                loadAllEvents();
                fetchEventLinks();
                fetchExternalStreams(true);
              }}
              className="h-11 w-11 rounded-2xl bg-white/[0.025] border border-white/[0.04] flex items-center justify-center text-muted-foreground/30 hover:text-foreground/70 hover:bg-white/[0.05] hover:border-white/[0.08] transition-all duration-300 backdrop-blur-sm"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        <div className="relative flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide mb-3">
          {SPORT_TABS.map((tab) => {
            const isActive = activeSport === tab.value;
            return (
              <motion.button
                key={tab.value}
                onClick={() => setActiveSport(tab.value)}
                whileTap={{ scale: 0.96 }}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[13px] font-semibold whitespace-nowrap transition-all duration-300 overflow-hidden",
                  isActive
                    ? "text-white shadow-lg shadow-primary/20"
                    : "text-muted-foreground/40 hover:text-muted-foreground/70 border border-white/[0.03] hover:border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.035]",
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sport-tab-bg"
                    className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary-glow rounded-2xl"
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  />
                )}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent rounded-2xl" />
                )}
                {isActive && (
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                )}
                <span className="relative z-10 text-sm">{tab.emoji}</span>
                <span className="relative z-10">{tab.label}</span>
              </motion.button>
            );
          })}
        </div>

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
                    "relative px-3 py-1.5 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all duration-300",
                    isActive
                      ? "bg-white/[0.08] text-foreground/90 border border-white/[0.1] shadow-sm"
                      : "text-muted-foreground/25 hover:text-muted-foreground/50 hover:bg-white/[0.02]",
                  )}
                >
                  {league.label} {count > 0 && <span className="text-muted-foreground/15 ml-0.5">{count}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {!loading && featuredLiveEvent && !searchQuery && !activeLeagueFilter && (
          <HeroBanner
            enriched={featuredLiveEvent}
            viewers={featuredViewers}
            hasLink={Boolean(eventLinks.get(featuredLiveEvent.event.id)?.url1)}
            onClick={() => handleEventClick(featuredLiveEvent)}
          />
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonEventCard key={i} />
          ))}
        </div>
      ) : gridEvents.length === 0 && dbOnlyEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="relative mb-8">
            <div className="absolute -inset-8 rounded-full bg-primary/[0.03] blur-3xl" />
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.04] flex items-center justify-center">
              <span className="text-5xl">🏟️</span>
            </div>
          </div>
          <p className="text-lg font-semibold text-foreground/50 mb-2">No hay eventos</p>
          <p className="text-sm text-muted-foreground/30 max-w-xs">No se encontraron partidos para esta categoría</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {gridEvents.map((enriched, index) => (
            <motion.div
              key={enriched.event.id}
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.03, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <EventCard
                event={enriched.event}
                leagueInfo={{
                  key: enriched.leagueKey,
                  name: enriched.leagueName,
                  sub: enriched.leagueSub,
                  logo: enriched.leagueLogo,
                }}
                hasLink={Boolean(eventLinks.get(enriched.event.id)?.url1)}
                isResolving={resolvingIds.has(enriched.event.id)}
                isFavorite={favorites.has(enriched.event.id)}
                onToggleFavorite={() => toggleFavorite(enriched.event.id)}
                onClick={() => handleEventClick(enriched)}
                formatTime={formatTime}
              />
            </motion.div>
          ))}
          {dbOnlyEvents
            .filter(
              (d) =>
                !allEnrichedEvents.some(({ event: e }) => {
                  const comp = e.competitions?.[0];
                  const competitors = comp?.competitors || [];
                  const home = competitors.find((c) => c.homeAway === "home");
                  const away = competitors.find((c) => c.homeAway === "away");
                  if (!home?.team?.displayName || !away?.team?.displayName) return false;
                  const dAll = normalizeText(`${d.name || ""} ${d.team_home || ""} ${d.team_away || ""}`);
                  return (
                    [normalizeText(home.team.displayName), normalizeText(home.team.shortDisplayName || "")].some(
                      (n) => n.length > 2 && dAll.includes(n),
                    ) &&
                    [normalizeText(away.team.displayName), normalizeText(away.team.shortDisplayName || "")].some(
                      (n) => n.length > 2 && dAll.includes(n),
                    )
                  );
                }),
            )
            .map((dbEvent, index) => (
              <motion.div
                key={`db-${dbEvent.name}-${index}`}
                className="cursor-pointer"
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: (gridEvents.length + index) * 0.03, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => handleDbEventClick(dbEvent)}
              >
                <DbEventCard event={dbEvent} />
              </motion.div>
            ))}
        </div>
      )}

      <div className="flex items-center justify-center pt-10 pb-3">
        <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-white/[0.015] border border-white/[0.03] backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5 text-primary/40" />
          <span className="text-[11px] text-muted-foreground/25 font-medium tabular-nums">{stats.total} eventos</span>
          <span className="w-px h-3 bg-white/[0.06]" />
          <span className="text-[11px] text-primary/40 font-medium tabular-nums">
            {stats.withLinks} disponibles para ver
          </span>
          {streamsLoadingBg && (
            <>
              <span className="w-px h-3 bg-white/[0.06]" />
              <Loader2 className="w-3 h-3 text-primary/30 animate-spin" />
              <span className="text-[11px] text-muted-foreground/20 font-medium">actualizando...</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const TEAM_LOGO_TTL_OK = 24 * 60 * 60 * 1000;
const TEAM_LOGO_TTL_NULL = 2 * 60 * 1000;
const teamLogoCache = new Map<string, { logo: string | null; ts: number }>();

async function fetchTeamLogo(teamName: string): Promise<string | null> {
  if (!teamName || teamName.length < 2) return null;
  const key = teamName.toLowerCase().trim();
  const cached = teamLogoCache.get(key);
  if (cached) {
    const ttl = cached.logo ? TEAM_LOGO_TTL_OK : TEAM_LOGO_TTL_NULL;
    if (Date.now() - cached.ts < ttl) return cached.logo;
  }
  try {
    for (const c of Array.from(
      new Set(
        [
          teamName,
          teamName.replace(/\b(Baseball|Basketball|Football|Hockey|Rugby)\b/gi, "").trim(),
          teamName.replace(/\b(Fc|CF|SC|SK|AC|Club)\b/gi, "").trim(),
        ].filter(Boolean),
      ),
    )) {
      const { data, error } = await supabase.functions.invoke("team-logo-search", { body: { t: c } });
      if (error) continue;
      const logo = data?.logo || null;
      if (logo) {
        teamLogoCache.set(key, { logo, ts: Date.now() });
        return logo;
      }
    }
    teamLogoCache.set(key, { logo: null, ts: Date.now() });
    return null;
  } catch {
    teamLogoCache.set(key, { logo: null, ts: Date.now() });
    return null;
  }
}

function TeamBadge({ name, fallback }: { name: string | null; fallback: string }) {
  const [logo, setLogo] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let c = false;
    if (!name) return;
    setError(false);
    fetchTeamLogo(name).then((url) => {
      if (!c) setLogo(url || null);
    });
    return () => {
      c = true;
    };
  }, [name]);
  if (logo && !error)
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
  return (
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-display text-lg text-foreground/60 border border-white/[0.06] bg-white/[0.04]">
      {fallback}
    </div>
  );
}

function DbEventCard({
  event,
}: {
  event: {
    name: string;
    team_home: string | null;
    team_away: string | null;
    sport: string | null;
    league: string | null;
    is_live: boolean;
    stream_url: string | null;
  };
}) {
  const homeInitials = (event.team_home || "?").slice(0, 3).toUpperCase();
  const awayInitials = (event.team_away || "?").slice(0, 3).toUpperCase();
  return (
    <div className="card-wrapper">
      <div
        className={cn(
          "premium-card card-shine cursor-pointer group rounded-2xl border border-white/[0.06] bg-card transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-white/[0.12]",
          event.is_live && "border-primary/20",
        )}
      >
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
        <div className="bg-card px-3 pt-2.5 pb-2.5 space-y-1">
          <h3 className="text-[13px] font-semibold text-foreground/90 leading-tight truncate">
            {event.team_home || "TBD"} vs {event.team_away || "TBD"}
          </h3>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-muted-foreground/50">
              {event.league || event.sport || "Sports"}
            </span>
            {event.stream_url && (
              <>
                <span className="text-[9px] text-muted-foreground/20">·</span>
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-success" />
                  <span className="text-[9px] font-medium text-success/70">Disponible</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
