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
    name: "⚽ Ligas Top Europeas",
    icon: "⚽",
    leagues: [
      { key: "eng.1", name: "Premier League", sport: "Soccer", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
      { key: "esp.1", name: "LaLiga", sport: "Soccer", flag: "🇪🇸" },
      { key: "ger.1", name: "Bundesliga", sport: "Soccer", flag: "🇩🇪" },
      { key: "ita.1", name: "Serie A", sport: "Soccer", flag: "🇮🇹" },
      { key: "fra.1", name: "Ligue 1", sport: "Soccer", flag: "🇫🇷" },
    ],
  },
  {
    name: "🥊 Boxing & MMA",
    icon: "🥊",
    leagues: [
      { key: "ufc", name: "UFC", sport: "MMA", flag: "🇺🇸" },
      { key: "boxing", name: "Boxing", sport: "Boxing", flag: "🥊" },
    ],
  },
];

const ALL_LEAGUES = LEAGUE_CATEGORIES.flatMap((cat) => cat.leagues);

/**
 * FUNCIÓN DE BÚSQUEDA AUTOMÁTICA DE ID EN MOVIEBITE
 */
const fetchMovieBiteId = async (homeTeam: string): Promise<string | null> => {
  try {
    const proxyUrl = "https://api.allorigins.win/get?url=";
    const targetUrl = encodeURIComponent("https://app.moviebite.cc/");
    const response = await fetch(`${proxyUrl}${targetUrl}`);
    const data = await response.json();
    const html = data.contents;

    const searchWord = homeTeam
      .toLowerCase()
      .split(" ")[0]
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const regex = new RegExp(`/watch/([a-z0-9-]+${searchWord}[a-z0-9-]+-[0-9]+)`, "i");
    const match = html.match(regex);

    return match ? match[1] : null;
  } catch (error) {
    console.error("Error en auto-search:", error);
    return null;
  }
};

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
    }
  };

  const handleMagicSearch = async () => {
    if (!selectedEvent) return;
    const home = selectedEvent.competitions[0].competitors.find((c) => c.homeAway === "home");
    if (!home) return;

    setSearching(true);
    const realId = await fetchMovieBiteId(home.team.displayName);
    if (realId) {
      const links = generateEmbedLinks(realId, "");
      setNewStreamUrl(links.url1);
      setNewStreamUrl2(links.url2);
      setNewStreamUrl3(links.url3);
      toast.success("✨ ID real de MovieBite encontrado");
    } else {
      toast.error("No se encontró ID numérico, usando genérico");
    }
    setSearching(false);
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
      toast.error("Error al guardar");
    } else {
      setEventLinks([data as EventLink, ...eventLinks]);
      resetDialog();
      toast.success("Evento guardado correctamente");
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
    if (error) toast.error("Error al guardar");
    else {
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

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl glass-panel p-6 bg-card/50 border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              Panel de Control FluxoTV
            </h2>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-primary">
            <Plus className="w-4 h-4 mr-2" /> Agregar Evento
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <StatCard label="Total" value={stats.total} icon={<Calendar className="w-4 h-4" />} color="text-foreground" />
          <StatCard
            label="En Vivo"
            value={stats.live}
            icon={<Radio className="w-4 h-4" />}
            color="text-red-500"
            pulse={stats.live > 0}
          />
          <StatCard
            label="Con Link"
            value={stats.withLink}
            icon={<Link2 className="w-4 h-4" />}
            color="text-green-500"
          />
          <StatCard
            label="Sin Link"
            value={stats.withoutLink}
            icon={<Circle className="w-4 h-4" />}
            color="text-yellow-500"
          />
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sincronizar con ESPN & MovieBite</DialogTitle>
          </DialogHeader>

          {!selectedEvent ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <select
                  className="flex-1 bg-background border p-2 rounded-md"
                  onChange={(e) => setSelectedLeague(e.target.value)}
                >
                  <option value="">Selecciona Liga...</option>
                  {ALL_LEAGUES.map((l) => (
                    <option key={l.key} value={l.key}>
                      {l.name}
                    </option>
                  ))}
                </select>
                <Button onClick={searchESPN} disabled={searching}>
                  {searching ? <Loader2 className="animate-spin" /> : "Buscar"}
                </Button>
              </div>

              <ScrollArea className="h-[300px]">
                {espnEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => selectEvent(event)}
                    className="p-3 border-b cursor-pointer hover:bg-muted"
                  >
                    {getEventName(event)}
                  </div>
                ))}
              </ScrollArea>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg flex items-center justify-between">
                <span className="font-bold">{getEventName(selectedEvent)}</span>
                <Button variant="outline" size="sm" onClick={handleMagicSearch} disabled={searching}>
                  {searching ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" /> Auto-ID
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Stream URL 1 (Admin)</Label>
                <Input value={newStreamUrl} onChange={(e) => setNewStreamUrl(e.target.value)} />
                <Label>Stream URL 2 (Delta)</Label>
                <Input value={newStreamUrl2} onChange={(e) => setNewStreamUrl2(e.target.value)} />
                <Label>Stream URL 3 (Echo)</Label>
                <Input value={newStreamUrl3} onChange={(e) => setNewStreamUrl3(e.target.value)} />
              </div>
              <Button className="w-full" onClick={addEventLink}>
                Guardar Evento
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ScrollArea className="h-[600px]">
        <div className="space-y-3">
          {filteredEvents.map((event, i) => (
            <EventRow
              key={event.id}
              event={event}
              index={i}
              saving={saving === event.id}
              onUpdateStreams={(urls: any) => updateStreamUrls(event, urls)}
              onToggleLive={(l: any) => updateStreamUrls(event, { is_live: l })}
              onToggleActive={(a: any) => updateStreamUrls(event, { is_active: a })}
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
    <div className="glass-panel p-4 border rounded-xl">
      <div className={`flex items-center gap-2 ${color}`}>
        {icon} <span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function EventRow({ event, saving, onUpdateStreams, onToggleLive, onToggleActive, onDelete }: any) {
  const [url1, setUrl1] = useState(event.stream_url || "");
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border rounded-xl bg-card p-4">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${event.is_live ? "bg-red-500 animate-pulse" : "bg-green-500"}`} />
          <span className="font-medium">{event.name}</span>
        </div>
        <ChevronDown className={isExpanded ? "rotate-180" : ""} />
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4 pt-4 border-t">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={event.is_live} onCheckedChange={onToggleLive} />
              <Label>En Vivo</Label>
            </div>
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <Input value={url1} onChange={(e) => setUrl1(e.target.value)} placeholder="URL del stream..." />
          <Button onClick={() => onUpdateStreams({ stream_url: url1 })} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : "Actualizar Link"}
          </Button>
        </div>
      )}
    </div>
  );
}
