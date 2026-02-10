import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchESPNScoreboard, ESPNEvent } from "@/lib/api";
import { generateAllLinkVariants } from "@/lib/embedLinkGenerator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Save,
  Trash2,
  Loader2,
  X,
  RefreshCw,
  Trophy,
  Search,
  Calendar,
  Zap,
  Globe,
  Filter,
  ChevronDown,
  ChevronRight,
  Circle,
  Radio,
  Eye,
  EyeOff,
  Link2,
  Sparkles,
  Clock,
  Wand2,
  Rocket,
  ExternalLink,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface EventLink {
  id: string;
  espn_id: string | null;
  name: string;
  event_date: string;
  sport: string | null;
  league: string | null;
  team_home: string | null;
  team_away: string | null;
  stream_url: string | null;
  stream_url_2: string | null;
  stream_url_3: string | null;
  thumbnail: string | null;
  is_live: boolean;
  is_active: boolean;
}

interface LeagueCategory {
  name: string;
  icon: string;
  leagues: { key: string; name: string; sport: string; flag?: string }[];
}

const LEAGUE_CATEGORIES: LeagueCategory[] = [
  {
    name: "🏀 Basketball",
    icon: "🏀",
    leagues: [
      { key: "nba", name: "NBA", sport: "Basketball", flag: "🇺🇸" },
      { key: "wnba", name: "WNBA", sport: "Basketball", flag: "🇺🇸" },
      { key: "ncaab", name: "NCAA Basketball", sport: "Basketball", flag: "🇺🇸" },
      { key: "euroleague", name: "EuroLeague", sport: "Basketball", flag: "🇪🇺" },
    ],
  },
  {
    name: "🏈 Football Americano",
    icon: "🏈",
    leagues: [
      { key: "nfl", name: "NFL", sport: "Football", flag: "🇺🇸" },
      { key: "ncaaf", name: "NCAA Football", sport: "Football", flag: "🇺🇸" },
      { key: "xfl", name: "XFL", sport: "Football", flag: "🇺🇸" },
    ],
  },
  {
    name: "🏒 Hockey",
    icon: "🏒",
    leagues: [
      { key: "nhl", name: "NHL", sport: "Hockey", flag: "🇺🇸" },
      { key: "khl", name: "KHL (Rusia)", sport: "Hockey", flag: "🇷🇺" },
      { key: "shl", name: "SHL (Suecia)", sport: "Hockey", flag: "🇸🇪" },
      { key: "ahl", name: "AHL", sport: "Hockey", flag: "🇺🇸" },
      { key: "liiga", name: "Liiga (Finlandia)", sport: "Hockey", flag: "🇫🇮" },
      { key: "del", name: "DEL (Alemania)", sport: "Hockey", flag: "🇩🇪" },
    ],
  },
  {
    name: "⚾ Baseball",
    icon: "⚾",
    leagues: [
      { key: "mlb", name: "MLB", sport: "Baseball", flag: "🇺🇸" },
      { key: "npb", name: "NPB (Japón)", sport: "Baseball", flag: "🇯🇵" },
      { key: "kbo", name: "KBO (Corea)", sport: "Baseball", flag: "🇰🇷" },
    ],
  },
  {
    name: "⚽ Ligas Top Europeas",
    icon: "⚽",
    leagues: [
      { key: "eng.1", name: "Premier League", sport: "Soccer", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
      { key: "esp.1", name: "LaLiga", sport: "Soccer", flag: "🇪🇸" },
      { key: "ger.1", name: "Bundesliga", sport: "Soccer", flag: "🇩🇪" },
      { key: "ita.1", name: "Serie A", sport: "Soccer", flag: "🇮🇹" },
      { key: "fra.1", name: "Ligue 1", sport: "Soccer", flag: "🇫🇷" },
      { key: "ned.1", name: "Eredivisie", sport: "Soccer", flag: "🇳🇱" },
      { key: "por.1", name: "Liga Portugal", sport: "Soccer", flag: "🇵🇹" },
      { key: "sco.1", name: "Scottish Premiership", sport: "Soccer", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
      { key: "bel.1", name: "Pro League (Bélgica)", sport: "Soccer", flag: "🇧🇪" },
      { key: "tur.1", name: "Süper Lig (Turquía)", sport: "Soccer", flag: "🇹🇷" },
    ],
  },
  {
    name: "🏆 Competiciones UEFA",
    icon: "🏆",
    leagues: [
      { key: "uefa.champions", name: "Champions League", sport: "Soccer", flag: "🇪🇺" },
      { key: "uefa.europa", name: "Europa League", sport: "Soccer", flag: "🇪🇺" },
      { key: "uefa.conference", name: "Conference League", sport: "Soccer", flag: "🇪🇺" },
      { key: "uefa.nations", name: "UEFA Nations League", sport: "Soccer", flag: "🇪🇺" },
      { key: "uefa.euro", name: "UEFA Euro", sport: "Soccer", flag: "🇪🇺" },
      { key: "uefa.super_cup", name: "Supercopa de Europa", sport: "Soccer", flag: "🇪🇺" },
    ],
  },
  {
    name: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Copas Inglaterra",
    icon: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    leagues: [
      { key: "eng.fa", name: "FA Cup", sport: "Soccer", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
      { key: "eng.league_cup", name: "Carabao Cup (EFL)", sport: "Soccer", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
      { key: "eng.community_shield", name: "Community Shield", sport: "Soccer", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
      { key: "eng.2", name: "Championship", sport: "Soccer", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
      { key: "eng.3", name: "League One", sport: "Soccer", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
    ],
  },
  {
    name: "🇪🇸 Copas España",
    icon: "🇪🇸",
    leagues: [
      { key: "esp.copa_del_rey", name: "Copa del Rey", sport: "Soccer", flag: "🇪🇸" },
      { key: "esp.super_cup", name: "Supercopa de España", sport: "Soccer", flag: "🇪🇸" },
      { key: "esp.2", name: "LaLiga 2", sport: "Soccer", flag: "🇪🇸" },
    ],
  },
  {
    name: "🇩🇪 Copas Alemania",
    icon: "🇩🇪",
    leagues: [
      { key: "ger.dfb_pokal", name: "DFB-Pokal", sport: "Soccer", flag: "🇩🇪" },
      { key: "ger.super_cup", name: "DFL-Supercup", sport: "Soccer", flag: "🇩🇪" },
      { key: "ger.2", name: "2. Bundesliga", sport: "Soccer", flag: "🇩🇪" },
    ],
  },
  {
    name: "🇮🇹 Copas Italia",
    icon: "🇮🇹",
    leagues: [
      { key: "ita.coppa_italia", name: "Coppa Italia", sport: "Soccer", flag: "🇮🇹" },
      { key: "ita.super_cup", name: "Supercoppa Italiana", sport: "Soccer", flag: "🇮🇹" },
      { key: "ita.2", name: "Serie B", sport: "Soccer", flag: "🇮🇹" },
    ],
  },
  {
    name: "🇫🇷 Copas Francia",
    icon: "🇫🇷",
    leagues: [
      { key: "fra.coupe_de_france", name: "Coupe de France", sport: "Soccer", flag: "🇫🇷" },
      { key: "fra.coupe_de_la_ligue", name: "Coupe de la Ligue", sport: "Soccer", flag: "🇫🇷" },
      { key: "fra.2", name: "Ligue 2", sport: "Soccer", flag: "🇫🇷" },
    ],
  },
  {
    name: "🌎 Américas",
    icon: "🌎",
    leagues: [
      { key: "mls", name: "MLS", sport: "Soccer", flag: "🇺🇸" },
      { key: "mex.1", name: "Liga MX", sport: "Soccer", flag: "🇲🇽" },
      { key: "mex.cup", name: "Copa MX", sport: "Soccer", flag: "🇲🇽" },
      { key: "arg.1", name: "Liga Argentina", sport: "Soccer", flag: "🇦🇷" },
      { key: "arg.cup", name: "Copa Argentina", sport: "Soccer", flag: "🇦🇷" },
      { key: "bra.1", name: "Brasileirão", sport: "Soccer", flag: "🇧🇷" },
      { key: "bra.cup", name: "Copa do Brasil", sport: "Soccer", flag: "🇧🇷" },
      { key: "col.1", name: "Liga Colombiana", sport: "Soccer", flag: "🇨🇴" },
      { key: "chi.1", name: "Primera División Chile", sport: "Soccer", flag: "🇨🇱" },
      { key: "per.1", name: "Liga 1 Perú", sport: "Soccer", flag: "🇵🇪" },
      { key: "conmebol.libertadores", name: "Copa Libertadores", sport: "Soccer", flag: "🌎" },
      { key: "conmebol.sudamericana", name: "Copa Sudamericana", sport: "Soccer", flag: "🌎" },
      { key: "conmebol.copa_america", name: "Copa América", sport: "Soccer", flag: "🌎" },
      { key: "concacaf.champions", name: "Concacaf Champions Cup", sport: "Soccer", flag: "🌎" },
      { key: "concacaf.nations", name: "Concacaf Nations League", sport: "Soccer", flag: "🌎" },
    ],
  },
  {
    name: "🌍 Internacionales",
    icon: "🌍",
    leagues: [
      { key: "fifa.world", name: "FIFA World Cup", sport: "Soccer", flag: "🌍" },
      { key: "fifa.wwc", name: "FIFA Women's World Cup", sport: "Soccer", flag: "🌍" },
      { key: "fifa.club_world_cup", name: "FIFA Club World Cup", sport: "Soccer", flag: "🌍" },
      { key: "afc.asian_cup", name: "AFC Asian Cup", sport: "Soccer", flag: "🌏" },
      { key: "caf.afcon", name: "Africa Cup of Nations", sport: "Soccer", flag: "🌍" },
    ],
  },
  {
    name: "🌏 Ligas Asia",
    icon: "🌏",
    leagues: [
      { key: "jpn.1", name: "J1 League (Japón)", sport: "Soccer", flag: "🇯🇵" },
      { key: "kor.1", name: "K League 1 (Corea)", sport: "Soccer", flag: "🇰🇷" },
      { key: "chn.1", name: "Chinese Super League", sport: "Soccer", flag: "🇨🇳" },
      { key: "sau.1", name: "Saudi Pro League", sport: "Soccer", flag: "🇸🇦" },
      { key: "aus.1", name: "A-League (Australia)", sport: "Soccer", flag: "🇦🇺" },
      { key: "ind.1", name: "Indian Super League", sport: "Soccer", flag: "🇮🇳" },
    ],
  },
  {
    name: "🥊 Boxing & MMA",
    icon: "🥊",
    leagues: [
      { key: "ufc", name: "UFC", sport: "MMA", flag: "🇺🇸" },
      { key: "boxing", name: "Boxing", sport: "Boxing", flag: "🥊" },
      { key: "bellator", name: "Bellator MMA", sport: "MMA", flag: "🇺🇸" },
      { key: "pfl", name: "PFL", sport: "MMA", flag: "🇺🇸" },
      { key: "one", name: "ONE Championship", sport: "MMA", flag: "🌏" },
    ],
  },
  {
    name: "🎾 Tenis",
    icon: "🎾",
    leagues: [
      { key: "atp", name: "ATP Tour", sport: "Tennis", flag: "🎾" },
      { key: "wta", name: "WTA Tour", sport: "Tennis", flag: "🎾" },
      { key: "grand.slam", name: "Grand Slam", sport: "Tennis", flag: "🏆" },
      { key: "davis.cup", name: "Copa Davis", sport: "Tennis", flag: "🏆" },
    ],
  },
  {
    name: "🏎️ Motorsports",
    icon: "🏎️",
    leagues: [
      { key: "f1", name: "Formula 1", sport: "Motorsports", flag: "🏎️" },
      { key: "motogp", name: "MotoGP", sport: "Motorsports", flag: "🏍️" },
      { key: "nascar", name: "NASCAR", sport: "Motorsports", flag: "🇺🇸" },
      { key: "indycar", name: "IndyCar", sport: "Motorsports", flag: "🇺🇸" },
      { key: "wrc", name: "WRC Rally", sport: "Motorsports", flag: "🚗" },
      { key: "formula.e", name: "Formula E", sport: "Motorsports", flag: "⚡" },
    ],
  },
  {
    name: "⛳ Golf",
    icon: "⛳",
    leagues: [
      { key: "pga", name: "PGA Tour", sport: "Golf", flag: "🇺🇸" },
      { key: "lpga", name: "LPGA Tour", sport: "Golf", flag: "🇺🇸" },
      { key: "european.tour", name: "DP World Tour", sport: "Golf", flag: "🇪🇺" },
      { key: "liv", name: "LIV Golf", sport: "Golf", flag: "🌍" },
    ],
  },
];

const ALL_LEAGUES = LEAGUE_CATEGORIES.flatMap((cat) => cat.leagues);

export function AdminEvents() {
  const [eventLinks, setEventLinks] = useState<EventLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [moviebiteOpen, setMoviebiteOpen] = useState(false);
  const [moviebiteLoading, setMoviebiteLoading] = useState(false);
  const [moviebiteResults, setMoviebiteResults] = useState<{ name: string; url: string; source: string }[]>([]);
  const [moviebiteChannels, setMoviebiteChannels] = useState<string[]>([]);
  const [moviebiteFilter, setMoviebiteFilter] = useState("");

  const [selectedLeague, setSelectedLeague] = useState<string>("");
  const [espnEvents, setEspnEvents] = useState<ESPNEvent[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ESPNEvent | null>(null);
  const [newStreamUrl, setNewStreamUrl] = useState("");
  const [newStreamUrl2, setNewStreamUrl2] = useState("");
  const [newStreamUrl3, setNewStreamUrl3] = useState("");
  const [espnSearchQuery, setEspnSearchQuery] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "live" | "with-link" | "without-link">("all");
  const [leagueSearch, setLeagueSearch] = useState("");
  const [openCategories, setOpenCategories] = useState<string[]>(["🏀 Basketball", "⚽ Ligas Top Europeas"]);

  useEffect(() => {
    fetchEventLinks();
    syncEventStatus();
  }, []);

  const syncEventStatus = async () => {
    try {
      await supabase.functions.invoke("sync-event-status");
    } catch (error) {
      console.error("Error syncing event status:", error);
    }
  };

  const handleAutoAssign = async () => {
    setAutoAssigning(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-assign-links");
      if (error) throw error;
      const result = data as { totalAssigned: number; assignedEvents: string[]; leaguesScanned: number };
      if (result.totalAssigned > 0) {
        toast.success(`⚡ ${result.totalAssigned} eventos asignados automáticamente`);
        fetchEventLinks();
      } else {
        toast.info("No hay partidos por empezar en los próximos 30 minutos");
      }
    } catch (error) {
      console.error("Error auto-assigning:", error);
      toast.error("Error al auto-asignar links");
    }
    setAutoAssigning(false);
  };

  const handleScrapeMoviebite = async () => {
    setMoviebiteLoading(true);
    setMoviebiteResults([]);
    setMoviebiteChannels([]);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-moviebite");
      if (error) throw error;
      const result = data as {
        matches: { name: string; url: string; source: string }[];
        allLinks: string[];
        totalFound: number;
      };
      setMoviebiteResults(result.matches || []);
      setMoviebiteChannels(result.allLinks || []);
      if (result.totalFound === 0 && result.allLinks.length === 0) {
        toast.info("No se encontraron links en moviebite");
      } else {
        toast.success(`🔍 ${result.matches.length} resultados, ${result.allLinks.length} links totales`);
      }
    } catch (error) {
      console.error("Error scraping moviebite:", error);
      toast.error("Error al scrapear moviebite");
    }
    setMoviebiteLoading(false);
  };

  const fetchEventLinks = async () => {
    const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: true });

    if (error) {
      toast.error("Error al cargar eventos");
    } else {
      setEventLinks((data as EventLink[]) || []);
    }
    setLoading(false);
  };

  const searchESPN = async () => {
    if (!selectedLeague) {
      toast.error("Selecciona una liga");
      return;
    }

    setSearching(true);
    try {
      const response = await fetchESPNScoreboard(selectedLeague);
      setEspnEvents(response.events || []);
      if (response.events?.length === 0) {
        toast.info("No hay eventos para hoy en esta liga");
      }
    } catch {
      toast.error("Error buscando en ESPN");
    }
    setSearching(false);
  };

  const selectEvent = (event: ESPNEvent) => {
    setSelectedEvent(event);
    setEspnEvents([]);

    const comp = event.competitions[0];
    const home = comp.competitors.find((c) => c.homeAway === "home");
    const away = comp.competitors.find((c) => c.homeAway === "away");

    if (home?.team.displayName && away?.team.displayName) {
      const links = generateAllLinkVariants(home.team.displayName, away.team.displayName);
      setNewStreamUrl(links.primary.url1);
      setNewStreamUrl2(links.primary.url2);
      setNewStreamUrl3(links.primary.url3);
      toast.success("🔗 Links generados automáticamente");
    }
  };

  const getEventName = (event: ESPNEvent) => {
    const comp = event.competitions[0];
    const home = comp.competitors.find((c) => c.homeAway === "home");
    const away = comp.competitors.find((c) => c.homeAway === "away");
    return `${home?.team.displayName || "TBD"} vs ${away?.team.displayName || "TBD"}`;
  };

  const addEventLink = async () => {
    if (!selectedEvent || !newStreamUrl) {
      toast.error("Selecciona un evento y agrega el link");
      return;
    }

    const comp = selectedEvent.competitions[0];
    const home = comp.competitors.find((c) => c.homeAway === "home");
    const away = comp.competitors.find((c) => c.homeAway === "away");
    const league = ALL_LEAGUES.find((l) => l.key === selectedLeague);

    const { data, error } = await supabase
      .from("events")
      .insert({
        espn_id: selectedEvent.id,
        name: getEventName(selectedEvent),
        event_date: selectedEvent.date,
        sport: league?.sport || null,
        league: league?.name || null,
        team_home: home?.team.displayName || null,
        team_away: away?.team.displayName || null,
        thumbnail: home?.team.logo || null,
        stream_url: newStreamUrl,
        stream_url_2: newStreamUrl2 || null,
        stream_url_3: newStreamUrl3 || null,
        is_live: comp.status.type.state === "in",
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes("duplicate")) {
        toast.error("Ya existe un link para este evento");
      } else {
        toast.error("Error al agregar link");
      }
    } else {
      setEventLinks([data as EventLink, ...eventLinks]);
      resetDialog();
      toast.success("✨ Link agregado correctamente");
    }
  };

  const resetDialog = () => {
    setSelectedEvent(null);
    setNewStreamUrl("");
    setNewStreamUrl2("");
    setNewStreamUrl3("");
    setLeagueSearch("");
    setEspnEvents([]);
    setEspnSearchQuery("");
    setIsDialogOpen(false);
  };

  const updateStreamUrls = async (
    event: EventLink,
    urls: { stream_url?: string; stream_url_2?: string; stream_url_3?: string },
  ) => {
    setSaving(event.id);
    const { error } = await supabase.from("events").update(urls).eq("id", event.id);

    if (error) {
      toast.error("Error al guardar links");
    } else {
      setEventLinks(eventLinks.map((e) => (e.id === event.id ? { ...e, ...urls } : e)));
      toast.success("Links guardados");
    }
    setSaving(null);
  };

  const toggleLive = async (event: EventLink, is_live: boolean) => {
    const { error } = await supabase.from("events").update({ is_live }).eq("id", event.id);

    if (error) {
      toast.error("Error al cambiar estado");
    } else {
      setEventLinks(eventLinks.map((e) => (e.id === event.id ? { ...e, is_live } : e)));
    }
  };

  const toggleActive = async (event: EventLink, is_active: boolean) => {
    const { error } = await supabase.from("events").update({ is_active }).eq("id", event.id);

    if (error) {
      toast.error("Error al cambiar estado");
    } else {
      setEventLinks(eventLinks.map((e) => (e.id === event.id ? { ...e, is_active } : e)));
    }
  };

  const deleteEventLink = async (id: string) => {
    const { error } = await supabase.from("events").delete().eq("id", id);

    if (error) {
      toast.error("Error al eliminar");
    } else {
      setEventLinks(eventLinks.filter((e) => e.id !== id));
      toast.success("Evento eliminado");
    }
  };

  const stats = useMemo(() => {
    const total = eventLinks.length;
    const live = eventLinks.filter((e) => e.is_live).length;
    const withLink = eventLinks.filter((e) => e.stream_url).length;
    const withoutLink = eventLinks.filter((e) => !e.stream_url).length;
    return { total, live, withLink, withoutLink };
  }, [eventLinks]);

  const filteredEvents = useMemo(() => {
    return eventLinks.filter((event) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch =
          event.name.toLowerCase().includes(query) ||
          event.league?.toLowerCase().includes(query) ||
          event.team_home?.toLowerCase().includes(query) ||
          event.team_away?.toLowerCase().includes(query) ||
          event.sport?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      if (filterStatus === "live" && !event.is_live) return false;
      if (filterStatus === "with-link" && !event.stream_url) return false;
      if (filterStatus === "without-link" && event.stream_url) return false;

      return true;
    });
  }, [eventLinks, searchQuery, filterStatus]);

  const filteredCategories = useMemo(() => {
    if (!leagueSearch) return LEAGUE_CATEGORIES;
    const query = leagueSearch.toLowerCase();
    return LEAGUE_CATEGORIES.map((cat) => ({
      ...cat,
      leagues: cat.leagues.filter((l) => l.name.toLowerCase().includes(query) || l.key.toLowerCase().includes(query)),
    })).filter((cat) => cat.leagues.length > 0);
  }, [leagueSearch]);

  const filteredEspnEvents = useMemo(() => {
    if (!espnSearchQuery.trim()) return espnEvents;
    const query = espnSearchQuery.toLowerCase().trim();
    return espnEvents.filter((event) => {
      const comp = event.competitions[0];
      const home = comp.competitors.find((c) => c.homeAway === "home");
      const away = comp.competitors.find((c) => c.homeAway === "away");
      return (
        home?.team.displayName?.toLowerCase().includes(query) ||
        home?.team.shortDisplayName?.toLowerCase().includes(query) ||
        away?.team.displayName?.toLowerCase().includes(query) ||
        away?.team.shortDisplayName?.toLowerCase().includes(query)
      );
    });
  }, [espnEvents, espnSearchQuery]);

  const toggleCategory = (catName: string) => {
    setOpenCategories((prev) => (prev.includes(catName) ? prev.filter((c) => c !== catName) : [...prev, catName]));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div
              className="w-12 h-12 rounded-full border-2 border-primary/30 animate-spin"
              style={{ borderTopColor: "hsl(var(--primary))" }}
            />
            <Sparkles className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-sm text-muted-foreground">Cargando eventos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl glass-panel p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-accent/10" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold tracking-wide flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              Gestión de Eventos
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Administra links de streaming para partidos y eventos deportivos
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleAutoAssign}
              disabled={autoAssigning}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 shadow-lg shadow-emerald-500/25"
            >
              {autoAssigning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
              Auto-Asignar (30 min)
            </Button>
            <Button variant="outline" onClick={() => setMoviebiteOpen(true)} className="border-border/50 bg-card/50">
              <ExternalLink className="w-4 h-4 mr-2" />
              IFRAME Quicklink
            </Button>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Evento
            </Button>
          </div>
        </div>

        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <StatCard
            label="Total Eventos"
            value={stats.total}
            icon={<Calendar className="w-4 h-4" />}
            color="text-foreground"
          />
          <StatCard
            label="En Vivo"
            value={stats.live}
            icon={<Radio className="w-4 h-4" />}
            color="text-red-400"
            pulse={stats.live > 0}
          />
          <StatCard
            label="Con Link"
            value={stats.withLink}
            icon={<Link2 className="w-4 h-4" />}
            color="text-green-400"
          />
          <StatCard
            label="Sin Link"
            value={stats.withoutLink}
            icon={<Circle className="w-4 h-4" />}
            color="text-yellow-400"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por equipo, liga o evento... (ej: Lakers, NBA)"
            className="pl-10 bg-card/50 border-border/50"
          />
        </div>

        <div className="flex gap-2">
          <FilterButton
            active={filterStatus === "all"}
            onClick={() => setFilterStatus("all")}
            label="Todos"
            count={stats.total}
          />
          <FilterButton
            active={filterStatus === "live"}
            onClick={() => setFilterStatus("live")}
            label="🔴 Live"
            count={stats.live}
          />
          <FilterButton
            active={filterStatus === "with-link"}
            onClick={() => setFilterStatus("with-link")}
            label="✓ Con Link"
            count={stats.withLink}
          />
          <FilterButton
            active={filterStatus === "without-link"}
            onClick={() => setFilterStatus("without-link")}
            label="⚠ Sin Link"
            count={stats.withoutLink}
          />
        </div>
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) resetDialog();
          setIsDialogOpen(open);
        }}
      >
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </div>
              Agregar Nuevo Evento
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-hidden">
            {!selectedEvent ? (
              <div className="space-y-4 h-full flex flex-col">
                <div className="relative shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={leagueSearch}
                    onChange={(e) => setLeagueSearch(e.target.value)}
                    placeholder="Buscar liga... (ej: Champions, NBA, UFC)"
                    className="pl-10"
                  />
                </div>

                {selectedLeague && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/30 shrink-0">
                    <Trophy className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">
                      {ALL_LEAGUES.find((l) => l.key === selectedLeague)?.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-auto"
                      onClick={() => setSelectedLeague("")}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                    <Button size="sm" onClick={searchESPN} disabled={searching} className="h-7">
                      {searching ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Search className="w-3 h-3 mr-1" />
                          Buscar en ESPN
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {espnEvents.length > 0 ? (
                  <div className="flex flex-col flex-1 min-h-0 space-y-3">
                    <div className="relative shrink-0">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={espnSearchQuery}
                        onChange={(e) => setEspnSearchQuery(e.target.value)}
                        placeholder="Buscar por equipo... (ej: Lakers, Bulls)"
                        className="pl-10"
                      />
                    </div>

                    <p className="text-xs text-muted-foreground shrink-0">
                      {filteredEspnEvents.length} de {espnEvents.length} evento(s)
                    </p>

                    <div className="flex-1 min-h-0 overflow-y-auto max-h-[350px] space-y-2 pr-2">
                      {filteredEspnEvents.map((event) => {
                        const comp = event.competitions[0];
                        const home = comp.competitors.find((c) => c.homeAway === "home");
                        const away = comp.competitors.find((c) => c.homeAway === "away");
                        const isLive = comp.status.type.state === "in";

                        return (
                          <div
                            key={event.id}
                            onClick={() => selectEvent(event)}
                            className="flex items-center gap-3 p-3 rounded-xl glass-panel hover:bg-white/5 cursor-pointer transition-all hover:scale-[1.01]"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {home?.team.logo && (
                                <img src={home.team.logo} alt="" className="w-10 h-10 object-contain" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {home?.team.shortDisplayName || "TBD"} vs {away?.team.shortDisplayName || "TBD"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(event.date).toLocaleString("es-ES")}
                                </p>
                              </div>
                              {away?.team.logo && (
                                <img src={away.team.logo} alt="" className="w-10 h-10 object-contain" />
                              )}
                            </div>
                            {isLive && (
                              <Badge variant="destructive" className="animate-pulse">
                                🔴 LIVE
                              </Badge>
                            )}
                          </div>
                        );
                      })}

                      {filteredEspnEvents.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No se encontraron partidos con "{espnSearchQuery}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="flex-1 -mx-2 px-2">
                    <div className="space-y-2 pb-4">
                      {filteredCategories.map((category) => (
                        <Collapsible
                          key={category.name}
                          open={openCategories.includes(category.name)}
                          onOpenChange={() => toggleCategory(category.name)}
                        >
                          <CollapsibleTrigger className="flex items-center gap-3 w-full p-3 rounded-xl glass-panel hover:bg-white/5 transition-all">
                            <span className="text-lg">{category.icon}</span>
                            <span className="font-medium flex-1 text-left">
                              {category.name.replace(/^[^\s]+\s/, "")}
                            </span>
                            <Badge variant="secondary" className="mr-2">
                              {category.leagues.length}
                            </Badge>
                            {openCategories.includes(category.name) ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="grid grid-cols-2 gap-2 pt-2 pl-4">
                              {category.leagues.map((league) => (
                                <button
                                  key={league.key}
                                  onClick={() => setSelectedLeague(league.key)}
                                  className={`flex items-center gap-2 p-2.5 rounded-lg text-left text-sm transition-all ${
                                    selectedLeague === league.key
                                      ? "bg-primary/20 border border-primary/50 text-primary"
                                      : "hover:bg-white/5 border border-transparent"
                                  }`}
                                >
                                  <span>{league.flag}</span>
                                  <span className="truncate">{league.name}</span>
                                </button>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                  <Trophy className="w-6 h-6 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{getEventName(selectedEvent)}</p>
                    <p className="text-xs text-muted-foreground">
                      {ALL_LEAGUES.find((l) => l.key === selectedLeague)?.name} •{" "}
                      {new Date(selectedEvent.date).toLocaleString("es-ES")}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedEvent(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <Wand2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-400">
                    Links generados automáticamente desde embedsports.top
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-7 text-xs"
                    onClick={() => {
                      const comp = selectedEvent.competitions[0];
                      const home = comp.competitors.find((c) => c.homeAway === "home");
                      const away = comp.competitors.find((c) => c.homeAway === "away");

                      if (home?.team.displayName && away?.team.displayName) {
                        const links = generateAllLinkVariants(home.team.displayName, away.team.displayName);
                        if (newStreamUrl.includes(links.primary.url1.split("/").slice(-2, -1)[0])) {
                          setNewStreamUrl(links.alternative.url1);
                          setNewStreamUrl2(links.alternative.url2);
                          setNewStreamUrl3(links.alternative.url3);
                          toast.info("Cambiado a variante alternativa (home-vs-away)");
                        } else {
                          setNewStreamUrl(links.primary.url1);
                          setNewStreamUrl2(links.primary.url2);
                          setNewStreamUrl3(links.primary.url3);
                          toast.info("Cambiado a variante primaria (away-vs-home)");
                        }
                      }
                    }}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Alternar orden
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">
                        1
                      </span>
                      Stream Principal *
                    </Label>
                    <Input
                      placeholder="https://...m3u8"
                      value={newStreamUrl}
                      onChange={(e) => setNewStreamUrl(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-muted text-muted-foreground text-xs flex items-center justify-center font-bold">
                        2
                      </span>
                      Stream Alternativo 1
                    </Label>
                    <Input
                      placeholder="https://...m3u8 (opcional)"
                      value={newStreamUrl2}
                      onChange={(e) => setNewStreamUrl2(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-muted text-muted-foreground text-xs flex items-center justify-center font-bold">
                        3
                      </span>
                      Stream Alternativo 2
                    </Label>
                    <Input
                      placeholder="https://...m3u8 (opcional)"
                      value={newStreamUrl3}
                      onChange={(e) => setNewStreamUrl3(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  onClick={addEventLink}
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  disabled={!newStreamUrl}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Agregar Evento
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ScrollArea className="h-[calc(100vh-400px)] min-h-[400px]">
        <div className="space-y-3 pr-4">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-16 glass-panel rounded-2xl">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-2">No hay eventos que mostrar</p>
              <p className="text-xs text-muted-foreground/60">
                {searchQuery || filterStatus !== "all"
                  ? "Intenta cambiar los filtros de búsqueda"
                  : "Busca en ESPN y agrega un link de stream"}
              </p>
            </div>
          ) : (
            filteredEvents.map((event, index) => (
              <EventRow
                key={event.id}
                event={event}
                saving={saving === event.id}
                onUpdateStreams={(urls) => updateStreamUrls(event, urls)}
                onToggleLive={(live) => toggleLive(event, live)}
                onToggleActive={(active) => toggleActive(event, active)}
                onDelete={() => deleteEventLink(event.id)}
                index={index}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <Dialog
        open={moviebiteOpen}
        onOpenChange={(open) => {
          setMoviebiteOpen(open);
          if (open && moviebiteResults.length === 0 && !moviebiteLoading) {
            handleScrapeMoviebite();
          }
        }}
      >
        <DialogContent className="bg-card border-border max-w-3xl h-[80vh] flex flex-col p-6">
          <DialogHeader className="shrink-0 mb-4">
            <DialogTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
                <ExternalLink className="w-5 h-5 text-white" />
              </div>
              Moviebite — Partidos en Vivo
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Solo se muestran los partidos activos en moviebite.cc. Al copiar, se genera automáticamente el link de
              embedsports.top.
            </p>
          </DialogHeader>

          <div className="flex items-center gap-3 shrink-0 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={moviebiteFilter}
                onChange={(e) => setMoviebiteFilter(e.target.value)}
                placeholder="Buscar partido activo (Lakers, Hawks, etc)..."
                className="pl-10 h-11 bg-muted/30 border-border/50"
              />
            </div>
            <Button
              size="icon"
              onClick={handleScrapeMoviebite}
              disabled={moviebiteLoading}
              variant="outline"
              className="h-11 w-11"
            >
              {moviebiteLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
            </Button>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden bg-muted/10 rounded-2xl border border-border/50">
            {moviebiteLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                <p className="text-sm font-medium animate-pulse">Sincronizando eventos en vivo...</p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-4 space-y-3">
                  {(() => {
                    const filter = moviebiteFilter.toLowerCase();

                    // FILTRAR SOLO PARTIDOS ACTIVOS ignorando canales estáticos
                    const matchesOnly = moviebiteResults.filter(
                      (m) =>
                        !m.url.includes("/channel/") &&
                        !m.url.includes("/channels") &&
                        m.url !== "https://app.moviebite.cc/live" &&
                        m.url !== "https://app.moviebite.cc/",
                    );

                    const filteredItems = matchesOnly.filter(
                      (item) => !filter || item.name.toLowerCase().includes(filter),
                    );

                    if (filteredItems.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                          <Trophy className="w-12 h-12 mb-4 opacity-10" />
                          <p className="text-base font-medium">No hay partidos en vivo</p>
                          <p className="text-xs text-center mt-1">Verifica que haya juegos activos en este momento.</p>
                        </div>
                      );
                    }

                    return filteredItems.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          let finalUrl = item.url;

                          // Transformación automática al formato ADMIN ppv-slug
                          if (item.url.includes("moviebite.cc")) {
                            const parts = item.url.split("/");
                            const slug = parts[parts.length - 1];
                            finalUrl = `https://embedsports.top/embed/admin/ppv-${slug}/1?autoplay=1`;
                          }

                          navigator.clipboard.writeText(finalUrl);
                          toast.success(`📋 Copiado: ${item.name}`, {
                            description: "Link generado para URL 1 (Admin)",
                          });
                        }}
                        className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border/50 hover:border-orange-500/50 hover:bg-orange-500/[0.02] transition-all group text-left shadow-sm mb-2"
                      >
                        <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                          <Trophy className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-bold text-foreground truncate group-hover:text-orange-500 transition-colors">
                              {item.name}
                            </p>
                            <Badge className="bg-red-500 text-white text-[9px] h-4 px-1.5 animate-pulse border-none">
                              LIVE
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate font-mono">
                            {item.url.split(".cc/")[1]}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 h-6 bg-muted/50 group-hover:bg-orange-500 group-hover:text-white transition-all"
                          >
                            Copiar Admin
                          </Badge>
                          <span className="text-[9px] text-primary/60 font-mono tracking-tighter italic">
                            embedsports.top
                          </span>
                        </div>
                      </button>
                    ));
                  })()}
                </div>
              </ScrollArea>
            )}
          </div>

          <div className="shrink-0 flex items-center justify-between text-[11px] text-muted-foreground pt-4 px-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>{moviebiteResults.length} eventos detectados</span>
            </div>
            <a
              href="https://app.moviebite.cc/live"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-orange-500 transition-colors font-semibold"
            >
              Ver en moviebite.cc <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  pulse,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  pulse?: boolean;
}) {
  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`${color} ${pulse ? "animate-pulse" : ""}`}>{icon}</div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-2xl font-bold font-tech ${color}`}>{value}</p>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
        active
          ? "bg-primary/20 text-primary border border-primary/30"
          : "bg-card/50 text-muted-foreground hover:bg-card border border-transparent"
      }`}
    >
      {label}
      <span className={`px-1.5 py-0.5 rounded text-[10px] ${active ? "bg-primary/30" : "bg-muted"}`}>{count}</span>
    </button>
  );
}

interface EventRowProps {
  event: EventLink;
  saving: boolean;
  onUpdateStreams: (urls: { stream_url?: string; stream_url_2?: string; stream_url_3?: string }) => void;
  onToggleLive: (live: boolean) => void;
  onToggleActive: (active: boolean) => void;
  onDelete: () => void;
  index: number;
}

function EventRow({ event, saving, onUpdateStreams, onToggleLive, onToggleActive, onDelete, index }: EventRowProps) {
  const [streamUrl, setStreamUrl] = useState(event.stream_url || "");
  const [streamUrl2, setStreamUrl2] = useState(event.stream_url_2 || "");
  const [streamUrl3, setStreamUrl3] = useState(event.stream_url_3 || "");
  const [isExpanded, setIsExpanded] = useState(false);
  const hasLink = Boolean(event.stream_url);

  const isModified =
    streamUrl !== (event.stream_url || "") ||
    streamUrl2 !== (event.stream_url_2 || "") ||
    streamUrl3 !== (event.stream_url_3 || "");

  const handleSave = () => {
    onUpdateStreams({
      stream_url: streamUrl || undefined,
      stream_url_2: streamUrl2 || undefined,
      stream_url_3: streamUrl3 || undefined,
    });
  };

  return (
    <div
      className={`glass-panel rounded-xl overflow-hidden transition-all duration-300 animate-fade-in ${
        !event.is_active ? "opacity-50" : ""
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div
          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
            event.is_live
              ? "bg-red-500 animate-pulse shadow-lg shadow-red-500/50"
              : hasLink
                ? "bg-green-500 shadow-lg shadow-green-500/30"
                : "bg-yellow-500 shadow-lg shadow-yellow-500/30"
          }`}
        />

        {event.thumbnail ? (
          <img src={event.thumbnail} alt="" className="w-10 h-10 object-contain shrink-0 rounded-lg bg-black/20 p-1" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-muted-foreground" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{event.name}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(event.event_date).toLocaleString("es-ES", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {event.league && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {event.league}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasLink ? (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30">
              <Link2 className="w-3 h-3 mr-1" />
              Link
            </Badge>
          ) : (
            <Badge variant="outline" className="border-yellow-500/30 text-yellow-400">
              Sin Link
            </Badge>
          )}

          {event.is_live && (
            <Badge variant="destructive" className="animate-pulse">
              🔴 LIVE
            </Badge>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
        />
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border/50 space-y-4 animate-fade-in">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Switch checked={event.is_live} onCheckedChange={onToggleLive} />
              <Label className="text-sm cursor-pointer" onClick={() => onToggleLive(!event.is_live)}>
                {event.is_live ? "🔴 EN VIVO" : "No en vivo"}
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={event.is_active} onCheckedChange={onToggleActive} />
              <Label
                className="text-sm cursor-pointer flex items-center gap-1"
                onClick={() => onToggleActive(!event.is_active)}
              >
                {event.is_active ? (
                  <>
                    <Eye className="w-3 h-3" /> Visible
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3 h-3" /> Oculto
                  </>
                )}
              </Label>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/20 ml-auto"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Eliminar
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary/20 text-primary text-xs flex items-center justify-center font-bold shrink-0">
                1
              </div>
              <Input
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="Stream principal..."
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-muted text-muted-foreground text-xs flex items-center justify-center font-bold shrink-0">
                2
              </div>
              <Input
                value={streamUrl2}
                onChange={(e) => setStreamUrl2(e.target.value)}
                placeholder="Stream alternativo 1..."
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-muted text-muted-foreground text-xs flex items-center justify-center font-bold shrink-0">
                3
              </div>
              <Input
                value={streamUrl3}
                onChange={(e) => setStreamUrl3(e.target.value)}
                placeholder="Stream alternativo 2..."
                className="flex-1"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving || !isModified}
              className={`${isModified ? "bg-gradient-to-r from-primary to-accent" : ""}`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar Cambios
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
