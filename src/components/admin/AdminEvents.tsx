import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchESPNScoreboard, ESPNEvent } from "@/lib/api";
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
  Satellite,
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
// Flat list for quick lookup
const ALL_LEAGUES = LEAGUE_CATEGORIES.flatMap((cat) => cat.leagues);
export function AdminEvents() {
  const [eventLinks, setEventLinks] = useState<EventLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [cleaningFinished, setCleaningFinished] = useState(false);
  // ESPN search state
  const [selectedLeague, setSelectedLeague] = useState("");
  const [espnEvents, setEspnEvents] = useState<ESPNEvent[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ESPNEvent | null>(null);
  const [newStreamUrl, setNewStreamUrl] = useState("");
  const [newStreamUrl2, setNewStreamUrl2] = useState("");
  const [newStreamUrl3, setNewStreamUrl3] = useState("");
  const [espnSearchQuery, setEspnSearchQuery] = useState("");
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "live" | "with-link" | "without-link">("all");
  const [leagueSearch, setLeagueSearch] = useState("");
  const [openCategories, setOpenCategories] = useState<string[]>(["🏀 Basketball", "⚽ Ligas Top Europeas"]);
  useEffect(() => {
    // Auto-limpiar eventos de días anteriores, luego cargar
    deleteOldEvents().then(() => {
      fetchEventLinks();
      syncEventStatus();
    });
  }, []);
  // 🧹 AUTO-LIMPIEZA: Elimina eventos de días anteriores (aunque tengan link)
  const deleteOldEvents = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();
      const { data: oldEvents, error: fetchError } = await supabase
        .from("events")
        .select("id, name, event_date")
        .lt("event_date", todayISO);
      if (fetchError) {
        console.error("Error buscando eventos antiguos:", fetchError);
        return;
      }
      if (!oldEvents || oldEvents.length === 0) {
        return;
      }
      const ids = oldEvents.map((e) => e.id);
      const { error } = await supabase.from("events").delete().in("id", ids);
      if (error) {
        console.error("Error eliminando eventos antiguos:", error);
      } else {
        console.log(`🧹 Auto-limpieza: ${ids.length} evento(s) de días anteriores eliminados`);
        toast.success(`🧹 ${ids.length} evento(s) de días anteriores eliminados automáticamente`);
      }
    } catch (error) {
      console.error("Error en auto-limpieza:", error);
    }
  };
  const syncEventStatus = async () => {
    try {
      await supabase.functions.invoke("sync-event-status");
      // Reload after sync to reflect deletions
      fetchEventLinks();
    } catch (error) {
      console.error("Error syncing event status:", error);
    }
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
  const selectEvent = async (event: ESPNEvent) => {
    setSelectedEvent(event);
    setEspnEvents([]);
    const comp = event.competitions[0];
    const home = comp.competitors.find((c) => c.homeAway === "home");
    const away = comp.competitors.find((c) => c.homeAway === "away");
    if (home?.team.displayName && away?.team.displayName) {
      const normalize = (s: string) =>
        s
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
      const homeWords = normalize(home.team.displayName).split(/\s+/);
      const awayWords = normalize(away.team.displayName).split(/\s+/);
      const { data: scrapedLinks } = await supabase.from("live_scraped_links").select("*");
      const match = (scrapedLinks || []).find((s: any) => {
        const title = normalize(s.match_title || "");
        const sHome = normalize(s.team_home || "");
        const sAway = normalize(s.team_away || "");
        const allText = `${title} ${sHome} ${sAway}`;
        const homeMatch = homeWords.some((w) => w.length > 2 && allText.includes(w));
        const awayMatch = awayWords.some((w) => w.length > 2 && allText.includes(w));
        return homeMatch && awayMatch;
      });
      if (match) {
        const m = match as any;
        const availableLinks = [m.source_admin, m.source_delta, m.source_echo, m.source_golf].filter(Boolean);
        setNewStreamUrl(availableLinks[0] || "");
        setNewStreamUrl2(availableLinks[1] || "");
        setNewStreamUrl3(availableLinks[2] || "");
        toast.success(`🛰️ ${availableLinks.length} link(s) del escáner asignados`);
      } else {
        setNewStreamUrl("");
        setNewStreamUrl2("");
        setNewStreamUrl3("");
        toast.info("No se encontraron links escaneados para este partido");
      }
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
  // 🗑️ LIMPIAR TODOS LOS FINALIZADOS
  const cleanAllFinished = async () => {
    setCleaningFinished(true);
    try {
      // 1. Delete all inactive events
      const { error: err1 } = await supabase.from("events").delete().eq("is_active", false);
      if (err1) throw err1;
      // 2. Delete events with no links and not live
      const { error: err2 } = await supabase.from("events").delete().eq("is_live", false).is("stream_url", null);
      if (err2) throw err2;
      toast.success("🗑️ Eventos finalizados eliminados");
      fetchEventLinks();
    } catch (error) {
      toast.error("Error al limpiar eventos");
      console.error(error);
    }
    setCleaningFinished(false);
  };
  // Stats
  const stats = useMemo(() => {
    const total = eventLinks.length;
    const live = eventLinks.filter((e) => e.is_live).length;
    const withLink = eventLinks.filter((e) => e.stream_url).length;
    const withoutLink = eventLinks.filter((e) => !e.stream_url).length;
    return { total, live, withLink, withoutLink };
  }, [eventLinks]);
  // Filtered events
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
  // Filtered leagues for dialog
  const filteredCategories = useMemo(() => {
    if (!leagueSearch) return LEAGUE_CATEGORIES;
    const query = leagueSearch.toLowerCase();
    return LEAGUE_CATEGORIES.map((cat) => ({
      ...cat,
      leagues: cat.leagues.filter((l) => l.name.toLowerCase().includes(query) || l.key.toLowerCase().includes(query)),
    })).filter((cat) => cat.leagues.length > 0);
  }, [leagueSearch]);
  // Filter ESPN events by team name
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
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 w-12 h-12 bg-primary/30 rounded-full blur-xl animate-pulse mx-auto" />
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto relative z-10" />
          </div>
          <p className="text-muted-foreground animate-pulse">Cargando eventos...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="glass-panel rounded-2xl p-6 space-y-6">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 rounded-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              Gestión de Eventos
            </h2>
            <p className="text-sm text-muted-foreground">
              Administra links de streaming para partidos y eventos deportivos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={cleanAllFinished}
              disabled={cleaningFinished}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              {cleaningFinished ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1" />
              )}
              Limpiar Finalizados
            </Button>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25"
            >
              <Plus className="w-4 h-4 mr-1" />
              Agregar Evento
            </Button>
          </div>
        </div>
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative">
          <StatCard label="Total" value={stats.total} icon={<Calendar className="w-4 h-4" />} color="text-foreground" />
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
      {/* Filters */}
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
        <div className="flex gap-1.5 flex-wrap">
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
      {/* Add Link Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) resetDialog();
          setIsDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              Agregar Nuevo Evento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!selectedEvent ? (
              <div className="space-y-4">
                {/* League Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={leagueSearch}
                    onChange={(e) => setLeagueSearch(e.target.value)}
                    placeholder="Buscar liga... (ej: Champions, NBA, UFC)"
                    className="pl-10"
                  />
                </div>
                {/* Selected League Indicator */}
                {selectedLeague && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20">
                    <Trophy className="w-4 h-4 text-primary" />
                    <Badge variant="secondary">{ALL_LEAGUES.find((l) => l.key === selectedLeague)?.name}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-auto"
                      onClick={() => setSelectedLeague("")}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                    <Button size="sm" onClick={searchESPN} disabled={searching}>
                      {searching ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-1" />
                          Buscar en ESPN
                        </>
                      )}
                    </Button>
                  </div>
                )}
                {/* ESPN Results */}
                {espnEvents.length > 0 ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={espnSearchQuery}
                        onChange={(e) => setEspnSearchQuery(e.target.value)}
                        placeholder="Buscar por equipo... (ej: Lakers, Bulls)"
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {filteredEspnEvents.length} de {espnEvents.length} evento(s)
                    </p>
                    <ScrollArea className="h-[300px]">
                      {filteredEspnEvents.map((event) => {
                        const comp = event.competitions[0];
                        const home = comp.competitors.find((c) => c.homeAway === "home");
                        const away = comp.competitors.find((c) => c.homeAway === "away");
                        const isLive = comp.status.type.state === "in";
                        return (
                          <div
                            key={event.id}
                            onClick={() => selectEvent(event)}
                            className="flex items-center gap-3 p-3 rounded-xl glass-panel hover:bg-white/5 cursor-pointer transition-all hover:scale-[1.01] mb-2"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              {home?.team.logo && <img src={home.team.logo} alt="" className="w-8 h-8 rounded" />}
                              <div className="flex-1">
                                <p className="font-medium text-sm">
                                  {home?.team.shortDisplayName || "TBD"} vs {away?.team.shortDisplayName || "TBD"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(event.date).toLocaleString("es-ES")}
                                </p>
                              </div>
                              {away?.team.logo && <img src={away.team.logo} alt="" className="w-8 h-8 rounded" />}
                            </div>
                            {isLive && <Badge className="bg-red-500 text-white animate-pulse">🔴 LIVE</Badge>}
                          </div>
                        );
                      })}
                      {filteredEspnEvents.length === 0 && (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No se encontraron partidos con "{espnSearchQuery}"</p>
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                ) : (
                  /* Categories List */
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-1">
                      {filteredCategories.map((category) => (
                        <Collapsible
                          key={category.name}
                          open={openCategories.includes(category.name)}
                          onOpenChange={() => toggleCategory(category.name)}
                        >
                          <CollapsibleTrigger className="flex items-center gap-2 w-full p-2.5 rounded-lg hover:bg-white/5 transition-colors text-left">
                            {category.icon}
                            <span className="font-medium text-sm flex-1">{category.name.replace(/^[^\s]+\s/, "")}</span>
                            <Badge variant="secondary" className="text-xs">
                              {category.leagues.length}
                            </Badge>
                            {openCategories.includes(category.name) ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="pl-6 space-y-0.5 pb-2">
                              {category.leagues.map((league) => (
                                <button
                                  key={league.key}
                                  onClick={() => setSelectedLeague(league.key)}
                                  className={`flex items-center gap-2 p-2.5 rounded-lg text-left text-sm transition-all w-full ${
                                    selectedLeague === league.key
                                      ? "bg-primary/20 border border-primary/50 text-primary"
                                      : "hover:bg-white/5 border border-transparent"
                                  }`}
                                >
                                  {league.flag}
                                  {league.name}
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
              /* Selected Event Form */
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl glass-panel">
                  <Trophy className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-bold">{getEventName(selectedEvent)}</p>
                    <p className="text-xs text-muted-foreground">
                      {ALL_LEAGUES.find((l) => l.key === selectedLeague)?.name} •{" "}
                      {new Date(selectedEvent.date).toLocaleString("es-ES")}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedEvent(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Satellite className="w-3.5 h-3.5" />
                  <span>
                    {newStreamUrl ? "Links reales del escáner asignados" : "Sin links escaneados — ingresa manualmente"}
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                      <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                        1
                      </span>
                      Stream Principal *
                    </Label>
                    <Input
                      value={newStreamUrl}
                      onChange={(e) => setNewStreamUrl(e.target.value)}
                      placeholder="https://stream-url.com"
                    />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                      <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                        2
                      </span>
                      Stream Alternativo 1
                    </Label>
                    <Input
                      value={newStreamUrl2}
                      onChange={(e) => setNewStreamUrl2(e.target.value)}
                      placeholder="https://stream-alt1.com"
                    />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                      <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                        3
                      </span>
                      Stream Alternativo 2
                    </Label>
                    <Input
                      value={newStreamUrl3}
                      onChange={(e) => setNewStreamUrl3(e.target.value)}
                      placeholder="https://stream-alt2.com"
                    />
                  </div>
                </div>
                <Button onClick={addEventLink} className="w-full bg-gradient-to-r from-primary to-accent">
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar Evento
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Event Links List */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-2">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto">
                <Trophy className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">No hay eventos que mostrar</p>
              <p className="text-sm text-muted-foreground/70">
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
    </div>
  );
}
// Stat Card Component
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
    <div className="glass-panel rounded-xl p-3 space-y-1">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={`${color} ${pulse ? "animate-pulse" : ""}`}>{icon}</span>
        {label}
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
// Filter Button Component
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
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className={active ? "" : "border-border/50"}
    >
      {label}
      <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
        {count}
      </Badge>
    </Button>
  );
}
// Event Row Component
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
    <div className="glass-panel rounded-xl overflow-hidden transition-all hover:bg-white/[0.02]">
      {/* Header Row */}
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="text-xs text-muted-foreground/50 w-5 text-center font-mono">{index + 1}</span>
        {event.thumbnail ? (
          <img src={event.thumbnail} alt="" className="w-8 h-8 rounded-lg object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{event.name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>
              {new Date(event.event_date).toLocaleString("es-ES", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {event.league && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {event.league}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {hasLink ? (
            <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">
              <Link2 className="w-3 h-3 mr-0.5" />
              Link
            </Badge>
          ) : (
            <Badge variant="outline" className="text-yellow-400 border-yellow-500/20 text-[10px]">
              Sin Link
            </Badge>
          )}
          {event.is_live && <Badge className="bg-red-500 text-white animate-pulse text-[10px]">🔴 LIVE</Badge>}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
        />
      </div>
      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/30 pt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-xs">En Vivo</Label>
              <Switch checked={event.is_live} onCheckedChange={() => onToggleLive(!event.is_live)}>
                {event.is_live ? "🔴 EN VIVO" : "No en vivo"}
              </Switch>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Visible</Label>
              <Switch checked={event.is_active} onCheckedChange={() => onToggleActive(!event.is_active)}>
                {event.is_active ? (
                  <>
                    <Eye className="w-3 h-3 mr-1" /> Visible
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3 h-3 mr-1" /> Oculto
                  </>
                )}
              </Switch>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="ml-auto"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Eliminar
            </Button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                1
              </span>
              <Input
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="Stream principal..."
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                2
              </span>
              <Input
                value={streamUrl2}
                onChange={(e) => setStreamUrl2(e.target.value)}
                placeholder="Stream alternativo 1..."
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                3
              </span>
              <Input
                value={streamUrl3}
                onChange={(e) => setStreamUrl3(e.target.value)}
                placeholder="Stream alternativo 2..."
                className="flex-1"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={!isModified || saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Guardar Cambios
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
