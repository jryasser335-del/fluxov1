import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchESPNScoreboard, ESPNEvent } from "@/lib/api";
import { generateEmbedLinks, generateAllLinkVariants } from "@/lib/embedLinkGenerator";
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
  SearchCode,
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

  // Estado del Escáner
  const [scrapedMatches, setScrapedMatches] = useState<{ id: string; name: string }[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    fetchEventLinks();
    syncEventStatus();
  }, []);

  const syncEventStatus = async () => {
    try {
      await supabase.functions.invoke("sync-event-status");
    } catch (error) {
      console.error(error);
    }
  };

  const fetchEventLinks = async () => {
    const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: true });
    if (!error) setEventLinks((data as EventLink[]) || []);
    setLoading(false);
  };

  const scanLiveLinks = async () => {
    setIsScanning(true);
    try {
      const response = await fetch(
        `https://api.allorigins.win/get?url=${encodeURIComponent("https://app.moviebite.cc/")}`,
      );
      const data = await response.json();
      const html = data.contents;
      const regex = /\/watch\/([a-z0-9-]+-[0-9]+)/g;
      const matches = [...html.matchAll(regex)];
      const uniqueIds = Array.from(new Set(matches.map((m) => m[1]))).map((id) => ({
        id: id,
        name: id.split("-").slice(0, -2).join(" ").toUpperCase(),
      }));
      setScrapedMatches(uniqueIds);
      toast.success(`${uniqueIds.length} eventos detectados`);
    } catch (error) {
      toast.error("Error al escanear");
    } finally {
      setIsScanning(false);
    }
  };

  const searchESPN = async () => {
    if (!selectedLeague) return;
    setSearching(true);
    try {
      const response = await fetchESPNScoreboard(selectedLeague);
      setEspnEvents(response.events || []);
    } catch {
      toast.error("Error en ESPN");
    }
    setSearching(false);
  };

  const selectEvent = (event: ESPNEvent) => {
    setSelectedEvent(event);
    const comp = event.competitions[0];
    const home = comp.competitors.find((c) => c.homeAway === "home");
    const away = comp.competitors.find((c) => c.homeAway === "away");
    if (home?.team.displayName && away?.team.displayName) {
      const links = generateAllLinkVariants(home.team.displayName, away.team.displayName);
      setNewStreamUrl(links.primary.url1);
      setNewStreamUrl2(links.primary.url2);
      setNewStreamUrl3(links.primary.url3);
    }
  };

  const assignScrapedId = (id: string) => {
    const links = generateAllLinkVariants(id, "");
    setNewStreamUrl(links.primary.url1);
    setNewStreamUrl2(links.primary.url2);
    setNewStreamUrl3(links.primary.url3);
    toast.info("ID Real asignado");
  };

  const getEventName = (event: ESPNEvent) => {
    const comp = event.competitions[0];
    const home = comp.competitors.find((c) => c.homeAway === "home");
    const away = comp.competitors.find((c) => c.homeAway === "away");
    return `${home?.team.displayName || "TBD"} vs ${away?.team.displayName || "TBD"}`;
  };

  const addEventLink = async () => {
    if (!selectedEvent || !newStreamUrl) return;
    const comp = selectedEvent.competitions[0];
    const home = comp.competitors.find((c) => c.homeAway === "home");
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
        team_away: comp.competitors.find((c) => c.homeAway === "away")?.team.displayName || null,
        thumbnail: home?.team.logo || null,
        stream_url: newStreamUrl,
        stream_url_2: newStreamUrl2 || null,
        stream_url_3: newStreamUrl3 || null,
        is_live: comp.status.type.state === "in",
      })
      .select()
      .single();
    if (!error) {
      setEventLinks([data as EventLink, ...eventLinks]);
      resetDialog();
      toast.success("Evento guardado");
    }
  };

  const resetDialog = () => {
    setSelectedEvent(null);
    setNewStreamUrl("");
    setNewStreamUrl2("");
    setNewStreamUrl3("");
    setIsDialogOpen(false);
  };

  const updateStreamUrls = async (event: EventLink, urls: any) => {
    setSaving(event.id);
    const { error } = await supabase.from("events").update(urls).eq("id", event.id);
    if (!error) {
      setEventLinks(eventLinks.map((e) => (e.id === event.id ? { ...e, ...urls } : e)));
      toast.success("Links actualizados");
    }
    setSaving(null);
  };

  const stats = useMemo(
    () => ({
      total: eventLinks.length,
      live: eventLinks.filter((e) => e.is_live).length,
      withLink: eventLinks.filter((e) => e.stream_url).length,
      withoutLink: eventLinks.filter((e) => !e.stream_url).length,
    }),
    [eventLinks],
  );

  const filteredEvents = useMemo(() => {
    return eventLinks.filter((e) => {
      if (searchQuery && !e.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterStatus === "live" && !e.is_live) return false;
      return true;
    });
  }, [eventLinks, searchQuery, filterStatus]);

  const toggleCategory = (catName: string) => {
    setOpenCategories((prev) => (prev.includes(catName) ? prev.filter((c) => c !== catName) : [...prev, catName]));
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Header Premium - Restaurado */}
      <div className="relative overflow-hidden rounded-2xl glass-panel p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-accent/10" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold tracking-wide flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              Gestión de Eventos
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Administra señales de streaming para FluxoTV</p>
          </div>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/25"
          >
            <Plus className="w-4 h-4 mr-2" /> Agregar Evento
          </Button>
        </div>

        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl bg-card border-border overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">Sincronizador FluxoTV</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Columna ESPN */}
            <div className="space-y-4 border-r pr-4 border-border/50">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">1. Datos Oficiales (ESPN)</Label>
              {!selectedEvent ? (
                <>
                  <div className="flex gap-2">
                    <select
                      className="flex-1 bg-background border p-2 rounded-md text-sm"
                      onChange={(e) => setSelectedLeague(e.target.value)}
                    >
                      <option value="">Elegir Liga...</option>
                      {ALL_LEAGUES.map((l) => (
                        <option key={l.key} value={l.key}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                    <Button onClick={searchESPN} disabled={searching} size="sm">
                      {searching ? <Loader2 className="animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                  <ScrollArea className="h-[300px] rounded-md border p-2 bg-black/20">
                    {espnEvents.map((e) => (
                      <div
                        key={e.id}
                        onClick={() => selectEvent(e)}
                        className="p-3 mb-1 rounded-lg hover:bg-primary/10 cursor-pointer border border-transparent hover:border-primary/20 transition-all text-xs"
                      >
                        {getEventName(e)}
                      </div>
                    ))}
                  </ScrollArea>
                </>
              ) : (
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                  <span className="font-bold text-sm">{getEventName(selectedEvent)}</span>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedEvent(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Columna Escáner */}
            <div className="space-y-4">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                2. Escáner de Señales Reales
              </Label>
              <Button
                variant="outline"
                className="w-full border-dashed border-primary/40 text-xs"
                onClick={scanLiveLinks}
                disabled={isScanning}
              >
                {isScanning ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  <Zap className="w-4 h-4 mr-2 text-yellow-400" />
                )}
                Escanear Cartelera en Vivo
              </Button>
              <ScrollArea className="h-[300px] rounded-md border p-2 bg-black/20">
                {scrapedMatches.map((match) => (
                  <div
                    key={match.id}
                    onClick={() => assignScrapedId(match.id)}
                    className="p-2 mb-1 rounded-md text-[10px] bg-white/5 hover:bg-primary/10 cursor-pointer flex justify-between items-center group border border-transparent hover:border-primary/20"
                  >
                    <span className="truncate flex-1">{match.name}</span>
                    <Badge className="h-4 text-[8px] bg-emerald-500/20 text-emerald-400">DETECTADO</Badge>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>

          {selectedEvent && (
            <div className="mt-4 p-4 rounded-xl bg-white/5 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px]">MovieBite (Admin)</Label>
                  <Input
                    value={newStreamUrl}
                    onChange={(e) => setNewStreamUrl(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Streamed (Delta)</Label>
                  <Input
                    value={newStreamUrl2}
                    onChange={(e) => setNewStreamUrl2(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Streamed (Echo)</Label>
                  <Input
                    value={newStreamUrl3}
                    onChange={(e) => setNewStreamUrl3(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <Button className="w-full bg-primary" onClick={addEventLink}>
                Publicar Evento
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lista de Eventos - Restaurado */}
      <ScrollArea className="h-[calc(100vh-400px)]">
        <div className="space-y-3 pr-4">
          {filteredEvents.map((event, index) => (
            <EventRow
              key={event.id}
              event={event}
              index={index}
              saving={saving === event.id}
              onUpdateStreams={(urls: any) => updateStreamUrls(event, urls)}
              onToggleLive={(live: any) => updateStreamUrls(event, { is_live: live })}
              onToggleActive={(active: any) => updateStreamUrls(event, { is_active: active })}
              onDelete={async () => {
                await supabase.from("events").delete().eq("id", event.id);
                fetchEventLinks();
              }}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function StatCard({ label, value, icon, color, pulse }: any) {
  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <div className={`${color} ${pulse ? "animate-pulse" : ""}`}>{icon}</div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function EventRow({ event, saving, onUpdateStreams, onToggleLive, onToggleActive, onDelete, index }: any) {
  const [u1, setU1] = useState(event.stream_url || "");
  const [u2, setU2] = useState(event.stream_url_2 || "");
  const [u3, setU3] = useState(event.stream_url_3 || "");
  const [exp, setExp] = useState(false);
  const isModified =
    u1 !== (event.stream_url || "") || u2 !== (event.stream_url_2 || "") || u3 !== (event.stream_url_3 || "");

  return (
    <div
      className={`glass-panel rounded-xl overflow-hidden transition-all duration-300 animate-fade-in ${!event.is_active ? "opacity-50" : ""}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5" onClick={() => setExp(!exp)}>
        <div className={`w-2 h-2 rounded-full ${event.is_live ? "bg-red-500 animate-pulse" : "bg-green-500"}`} />
        <div className="flex-1 font-medium text-sm">{event.name}</div>
        <Badge variant="secondary" className="text-[10px]">
          {event.league}
        </Badge>
        <ChevronDown className={`w-4 h-4 transition-transform ${exp ? "rotate-180" : ""}`} />
      </div>
      {exp && (
        <div className="p-4 border-t border-white/5 bg-white/5 space-y-4">
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={event.is_live} onCheckedChange={onToggleLive} />
              <Label className="text-xs">Live</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={event.is_active} onCheckedChange={onToggleActive} />
              <Label className="text-xs">Visible</Label>
            </div>
            <Button variant="ghost" size="sm" className="ml-auto text-red-400 h-7" onClick={onDelete}>
              <Trash2 className="w-3 h-3 mr-1" /> Eliminar
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={u1} onChange={(e) => setU1(e.target.value)} placeholder="Link 1..." className="h-8 text-xs" />
            <Input value={u2} onChange={(e) => setU2(e.target.value)} placeholder="Link 2..." className="h-8 text-xs" />
            <Input value={u3} onChange={(e) => setU3(e.target.value)} placeholder="Link 3..." className="h-8 text-xs" />
          </div>
          <Button
            size="sm"
            className={`w-full h-8 ${isModified ? "bg-primary text-white" : ""}`}
            onClick={() => onUpdateStreams({ stream_url: u1, stream_url_2: u2, stream_url_3: u3 })}
            disabled={saving || !isModified}
          >
            {saving ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <Save className="w-3 h-3 mr-1" /> Guardar Cambios
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
