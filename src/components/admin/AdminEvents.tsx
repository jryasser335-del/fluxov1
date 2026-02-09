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
    name: "⚽ Ligas Top Europeas",
    icon: "⚽",
    leagues: [
      { key: "eng.1", name: "Premier League", sport: "Soccer", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
      { key: "esp.1", name: "LaLiga", sport: "Soccer", flag: "🇪🇸" },
      { key: "ger.1", name: "Bundesliga", sport: "Soccer", flag: "🇩🇪" },
      { key: "ita.1", name: "Serie A", sport: "Soccer", flag: "🇮🇹" },
      { key: "fra.1", name: "Ligue 1", sport: "Soccer", flag: "🇫🇷" },
      { key: "sau.1", name: "Saudi Pro League", sport: "Soccer", flag: "🇸🇦" },
    ],
  },
  // ... (puedes mantener el resto de tus categorías iguales)
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

  const fetchEventLinks = async () => {
    const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: true });

    if (error) {
      toast.error("Error al cargar eventos");
    } else {
      setEventLinks((data as EventLink[]) || []);
    }
    setLoading(false);
  };

  // --- FUNCIÓN DE AUTO-SYNC PARA EL PANEL DE ADMIN ---
  const autoSyncLeague = async () => {
    if (!selectedLeague) return;
    setSearching(true);
    try {
      const response = await fetchESPNScoreboard(selectedLeague);
      const league = ALL_LEAGUES.find((l) => l.key === selectedLeague);

      const eventsToUpsert = response.events.map((event) => {
        const comp = event.competitions[0];
        const home = comp.competitors.find((c) => c.homeAway === "home")?.team.displayName || "";
        const away = comp.competitors.find((c) => c.homeAway === "away")?.team.displayName || "";

        // Generamos links con orden CORRECTO (home-vs-away) para que se reproduzcan
        const links = generateAllLinkVariants(home, away);

        return {
          espn_id: event.id,
          name: `${home} vs ${away}`,
          event_date: event.date,
          sport: league?.sport || null,
          league: league?.name || null,
          team_home: home,
          team_away: away,
          thumbnail: comp.competitors.find((c) => c.homeAway === "home")?.team.logo || null,
          stream_url: links.alternative.url1, // Usamos alternativa (home-vs-away) para mayor compatibilidad
          stream_url_2: links.alternative.url2,
          stream_url_3: links.alternative.url3,
          is_live: comp.status.type.state === "in",
          is_active: true,
        };
      });

      const { error } = await supabase.from("events").upsert(eventsToUpsert, { onConflict: "espn_id" });

      if (error) throw error;

      toast.success(`✅ ${eventsToUpsert.length} partidos sincronizados automáticamente`);
      fetchEventLinks();
      resetDialog();
    } catch (err) {
      toast.error("Error en auto-sincronización");
    } finally {
      setSearching(false);
    }
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
      // CORRECCIÓN: Usamos alternative (home-vs-away) por defecto para que los links SE REPRODUZCAN
      setNewStreamUrl(links.alternative.url1);
      setNewStreamUrl2(links.alternative.url2);
      setNewStreamUrl3(links.alternative.url3);
      toast.success("🔗 Links generados (Home vs Away)");
    }
  };

  const addEventLink = async () => {
    if (!selectedEvent || !newStreamUrl) return;

    const comp = selectedEvent.competitions[0];
    const home = comp.competitors.find((c) => c.homeAway === "home");
    const away = comp.competitors.find((c) => c.homeAway === "away");
    const league = ALL_LEAGUES.find((l) => l.key === selectedLeague);

    const { data, error } = await supabase
      .from("events")
      .insert({
        espn_id: selectedEvent.id,
        name: `${home?.team.displayName} vs ${away?.team.displayName}`,
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
      toast.error("Error al agregar link");
    } else {
      setEventLinks([data as EventLink, ...eventLinks]);
      resetDialog();
      toast.success("✨ Evento guardado con éxito");
    }
  };

  const resetDialog = () => {
    setSelectedEvent(null);
    setNewStreamUrl("");
    setNewStreamUrl2("");
    setNewStreamUrl3("");
    setLeagueSearch("");
    setEspnEvents([]);
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

  const deleteEventLink = async (id: string) => {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (!error) {
      setEventLinks(eventLinks.filter((e) => e.id !== id));
      toast.success("Evento eliminado");
    }
  };

  const filteredEvents = useMemo(() => {
    return eventLinks.filter((event) => {
      const query = searchQuery.toLowerCase().trim();
      if (query && !event.name.toLowerCase().includes(query)) return false;
      if (filterStatus === "live" && !event.is_live) return false;
      if (filterStatus === "without-link" && event.stream_url) return false;
      return true;
    });
  }, [eventLinks, searchQuery, filterStatus]);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl glass-panel p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold flex items-center gap-3">
              <Trophy className="w-6 h-6 text-primary" /> Gestión de Admin
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Links automáticos de embedsports.top habilitados</p>
          </div>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/25"
          >
            <Plus className="w-4 h-4 mr-2" /> Agregar Evento
          </Button>
        </div>
      </div>

      {/* Listado de eventos con ScrollArea */}
      <ScrollArea className="h-[calc(100vh-400px)] min-h-[400px]">
        <div className="space-y-3 pr-4">
          {filteredEvents.map((event, index) => (
            <EventRow
              key={event.id}
              event={event}
              saving={saving === event.id}
              onUpdateStreams={(urls) => updateStreamUrls(event, urls)}
              onDelete={() => deleteEventLink(event.id)}
              index={index}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Diálogo de búsqueda ESPN */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>Sincronizar con ESPN</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Buscar liga..."
              value={leagueSearch}
              onChange={(e) => setLeagueSearch(e.target.value)}
            />

            {selectedLeague && (
              <div className="flex gap-2">
                <Button onClick={searchESPN} disabled={searching} variant="secondary">
                  {searching ? <Loader2 className="animate-spin" /> : "Ver partidos"}
                </Button>
                <Button onClick={autoSyncLeague} disabled={searching} className="bg-emerald-600 hover:bg-emerald-700">
                  <Wand2 className="w-4 h-4 mr-2" /> Auto-Sincronizar Todo Hoy
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
              {LEAGUE_CATEGORIES.flatMap((c) => c.leagues)
                .filter((l) => l.name.toLowerCase().includes(leagueSearch.toLowerCase()))
                .map((l) => (
                  <Button
                    key={l.key}
                    variant={selectedLeague === l.key ? "default" : "outline"}
                    onClick={() => setSelectedLeague(l.key)}
                    className="justify-start"
                  >
                    {l.flag} {l.name}
                  </Button>
                ))}
            </div>

            {espnEvents.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <p className="text-xs font-bold text-muted-foreground">Partidos encontrados:</p>
                {espnEvents.map((e) => (
                  <div
                    key={e.id}
                    onClick={() => selectEvent(e)}
                    className="p-2 border rounded-lg hover:bg-accent cursor-pointer flex justify-between items-center"
                  >
                    <span className="text-sm font-medium">
                      {e.competitions[0].competitors[0].team.abbreviation} vs{" "}
                      {e.competitions[0].competitors[1].team.abbreviation}
                    </span>
                    <Badge variant="outline">Seleccionar</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sub-componente EventRow (resumido para el ejemplo)
function EventRow({ event, saving, onUpdateStreams, onDelete, index }: any) {
  const [url, setUrl] = useState(event.stream_url || "");
  const isModified = url !== (event.stream_url || "");

  return (
    <div className="glass-panel p-4 rounded-xl flex items-center justify-between gap-4">
      <div className="flex-1">
        <p className="font-bold text-sm">{event.name}</p>
        <Input
          className="mt-2 h-8 text-xs"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL del stream..."
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onUpdateStreams({ stream_url: url })} disabled={!isModified || saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4" />}
        </Button>
        <Button size="sm" variant="destructive" onClick={onDelete}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
