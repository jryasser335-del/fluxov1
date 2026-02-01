import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchESPNScoreboard, ESPNEvent } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  Plus, Save, Trash2, Loader2, Link as LinkIcon, X, 
  RefreshCw, Trophy, Search
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const LEAGUES = [
  // US Sports
  { key: "nba", name: "NBA", sport: "Basketball" },
  { key: "nfl", name: "NFL", sport: "Football" },
  { key: "mlb", name: "MLB", sport: "Baseball" },
  { key: "nhl", name: "NHL", sport: "Hockey" },
  { key: "mls", name: "MLS", sport: "Soccer" },
  
  // European Soccer
  { key: "eng.1", name: "Premier League", sport: "Soccer" },
  { key: "esp.1", name: "LaLiga", sport: "Soccer" },
  { key: "ger.1", name: "Bundesliga", sport: "Soccer" },
  { key: "ita.1", name: "Serie A", sport: "Soccer" },
  { key: "fra.1", name: "Ligue 1", sport: "Soccer" },
  { key: "ned.1", name: "Eredivisie", sport: "Soccer" },
  { key: "por.1", name: "Liga Portugal", sport: "Soccer" },
  
  // UEFA Competitions
  { key: "uefa.champions", name: "Champions League", sport: "Soccer" },
  { key: "uefa.europa", name: "Europa League", sport: "Soccer" },
  { key: "uefa.conference", name: "Conference League", sport: "Soccer" },
  
  // Americas
  { key: "mex.1", name: "Liga MX", sport: "Soccer" },
  { key: "arg.1", name: "Liga Argentina", sport: "Soccer" },
  { key: "bra.1", name: "Brasileirão", sport: "Soccer" },
  { key: "conmebol.libertadores", name: "Copa Libertadores", sport: "Soccer" },
  { key: "conmebol.sudamericana", name: "Copa Sudamericana", sport: "Soccer" },
  
  // Other European
  { key: "eng.2", name: "Championship", sport: "Soccer" },
  { key: "esp.2", name: "LaLiga 2", sport: "Soccer" },
];

export function AdminEvents() {
  const [eventLinks, setEventLinks] = useState<EventLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // ESPN search state
  const [selectedLeague, setSelectedLeague] = useState<string>("");
  const [espnEvents, setEspnEvents] = useState<ESPNEvent[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ESPNEvent | null>(null);
  const [newStreamUrl, setNewStreamUrl] = useState("");

  useEffect(() => {
    fetchEventLinks();
  }, []);

  const fetchEventLinks = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true });

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
  };

  const getEventName = (event: ESPNEvent) => {
    const comp = event.competitions[0];
    const home = comp.competitors.find(c => c.homeAway === "home");
    const away = comp.competitors.find(c => c.homeAway === "away");
    return `${home?.team.displayName || "TBD"} vs ${away?.team.displayName || "TBD"}`;
  };

  const addEventLink = async () => {
    if (!selectedEvent || !newStreamUrl) {
      toast.error("Selecciona un evento y agrega el link");
      return;
    }

    const comp = selectedEvent.competitions[0];
    const home = comp.competitors.find(c => c.homeAway === "home");
    const away = comp.competitors.find(c => c.homeAway === "away");
    const league = LEAGUES.find(l => l.key === selectedLeague);

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
      setSelectedEvent(null);
      setNewStreamUrl("");
      setIsDialogOpen(false);
      toast.success("Link agregado");
    }
  };

  const updateStreamUrls = async (event: EventLink, urls: { stream_url?: string; stream_url_2?: string; stream_url_3?: string }) => {
    setSaving(event.id);
    const { error } = await supabase
      .from("events")
      .update(urls)
      .eq("id", event.id);

    if (error) {
      toast.error("Error al guardar links");
    } else {
      setEventLinks(eventLinks.map(e => e.id === event.id ? { ...e, ...urls } : e));
      toast.success("Links guardados");
    }
    setSaving(null);
  };

  const toggleLive = async (event: EventLink, is_live: boolean) => {
    const { error } = await supabase
      .from("events")
      .update({ is_live })
      .eq("id", event.id);

    if (error) {
      toast.error("Error al cambiar estado");
    } else {
      setEventLinks(eventLinks.map(e => e.id === event.id ? { ...e, is_live } : e));
    }
  };

  const toggleActive = async (event: EventLink, is_active: boolean) => {
    const { error } = await supabase
      .from("events")
      .update({ is_active })
      .eq("id", event.id);

    if (error) {
      toast.error("Error al cambiar estado");
    } else {
      setEventLinks(eventLinks.map(e => e.id === event.id ? { ...e, is_active } : e));
    }
  };

  const deleteEventLink = async (id: string) => {
    const { error } = await supabase.from("events").delete().eq("id", id);

    if (error) {
      toast.error("Error al eliminar");
    } else {
      setEventLinks(eventLinks.filter(e => e.id !== id));
      toast.success("Evento eliminado");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Links de Eventos</h2>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Agregar Link
        </Button>
      </div>

      {/* Add Link Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setSelectedEvent(null);
          setEspnEvents([]);
          setNewStreamUrl("");
        }
      }}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>Agregar Link de Evento</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Search ESPN */}
            {!selectedEvent && (
              <div className="space-y-3">
                <Label>Buscar en ESPN</Label>
                <div className="flex gap-2">
                  <Select value={selectedLeague} onValueChange={setSelectedLeague}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecciona liga..." />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {LEAGUES.map(league => (
                        <SelectItem key={league.key} value={league.key}>
                          {league.name} ({league.sport})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={searchESPN} disabled={searching || !selectedLeague}>
                    {searching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Search Results */}
                {espnEvents.length > 0 && (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {espnEvents.map((event) => {
                      const comp = event.competitions[0];
                      const home = comp.competitors.find(c => c.homeAway === "home");
                      const away = comp.competitors.find(c => c.homeAway === "away");
                      const isLive = comp.status.type.state === "in";
                      
                      return (
                        <div
                          key={event.id}
                          onClick={() => selectEvent(event)}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/10"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            {home?.team.logo && (
                              <img src={home.team.logo} alt={home.team.shortDisplayName} className="w-8 h-8 object-contain" />
                            )}
                            <span className="text-sm font-medium">
                              {home?.team.shortDisplayName || "TBD"}
                            </span>
                            <span className="text-xs text-muted-foreground">vs</span>
                            <span className="text-sm font-medium">
                              {away?.team.shortDisplayName || "TBD"}
                            </span>
                            {away?.team.logo && (
                              <img src={away.team.logo} alt={away.team.shortDisplayName} className="w-8 h-8 object-contain" />
                            )}
                          </div>
                          <div className="text-right">
                            {isLive ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                                🔴 EN VIVO
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {new Date(event.date).toLocaleTimeString("es-ES", { 
                                  hour: "2-digit", 
                                  minute: "2-digit" 
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Selected Event */}
            {selectedEvent && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                  <Trophy className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">{getEventName(selectedEvent)}</p>
                    <p className="text-xs text-muted-foreground">
                      {LEAGUES.find(l => l.key === selectedLeague)?.name} • {new Date(selectedEvent.date).toLocaleString("es-ES")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedEvent(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Stream URL *</Label>
                  <Input
                    placeholder="https://...m3u8"
                    value={newStreamUrl}
                    onChange={(e) => setNewStreamUrl(e.target.value)}
                  />
                </div>

                <Button onClick={addEventLink} className="w-full">
                  Agregar Link
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Links List */}
      <div className="space-y-3">
        {eventLinks.map((event) => (
          <EventRow
            key={event.id}
            event={event}
            saving={saving === event.id}
            onUpdateStreams={(urls) => updateStreamUrls(event, urls)}
            onToggleLive={(live) => toggleLive(event, live)}
            onToggleActive={(active) => toggleActive(event, active)}
            onDelete={() => deleteEventLink(event.id)}
          />
        ))}

        {eventLinks.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No hay eventos. Busca en ESPN y agrega un link de stream.
          </div>
        )}
      </div>
    </div>
  );
}

interface EventRowProps {
  event: EventLink;
  saving: boolean;
  onUpdateStreams: (urls: { stream_url?: string; stream_url_2?: string; stream_url_3?: string }) => void;
  onToggleLive: (live: boolean) => void;
  onToggleActive: (active: boolean) => void;
  onDelete: () => void;
}

function EventRow({ event, saving, onUpdateStreams, onToggleLive, onToggleActive, onDelete }: EventRowProps) {
  const [streamUrl, setStreamUrl] = useState(event.stream_url || "");
  const [streamUrl2, setStreamUrl2] = useState(event.stream_url_2 || "");
  const [streamUrl3, setStreamUrl3] = useState(event.stream_url_3 || "");
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
    <div className={`glass-panel rounded-xl p-3 space-y-3 ${!event.is_active ? 'opacity-50' : ''}`}>
      {/* Header Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status indicator */}
        <div className={`w-2 h-2 rounded-full shrink-0 ${event.is_live ? 'bg-red-500 animate-pulse' : hasLink ? 'bg-green-500' : 'bg-yellow-500'}`} />
        
        {/* Thumbnail */}
        {event.thumbnail && (
          <img src={event.thumbnail} alt="" className="w-8 h-8 object-contain shrink-0" />
        )}
        
        {/* Event info */}
        <div className="flex-1 min-w-[200px]">
          <div className="font-medium text-sm">{event.name}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            {new Date(event.event_date).toLocaleString("es-ES", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit"
            })}
            {event.league && <span className="text-primary">• {event.league}</span>}
          </div>
        </div>

        {/* Quick status badges */}
        <div className="flex items-center gap-2">
          {hasLink ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
              CON LINK
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              SIN LINK
            </span>
          )}
        </div>

        {/* Live toggle */}
        <div className="flex items-center gap-2">
          <Switch
            checked={event.is_live}
            onCheckedChange={onToggleLive}
            className="scale-75"
          />
          <span className="text-[10px] text-muted-foreground w-12">
            {event.is_live ? "🔴 LIVE" : "OFF"}
          </span>
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-2">
          <Switch
            checked={event.is_active}
            onCheckedChange={onToggleActive}
            className="scale-75"
          />
          <span className="text-[10px] text-muted-foreground w-12">
            {event.is_active ? "Activo" : "Oculto"}
          </span>
        </div>

        {/* Delete */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:bg-destructive/20"
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Stream URLs */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-4 flex justify-center shrink-0">
            <span className="text-[10px] font-bold text-primary">1</span>
          </div>
          <Input
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            placeholder="Opción 1 (principal)..."
            className="text-sm h-9 flex-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 flex justify-center shrink-0">
            <span className="text-[10px] font-bold text-muted-foreground">2</span>
          </div>
          <Input
            value={streamUrl2}
            onChange={(e) => setStreamUrl2(e.target.value)}
            placeholder="Opción 2 (alternativo)..."
            className="text-sm h-9 flex-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 flex justify-center shrink-0">
            <span className="text-[10px] font-bold text-muted-foreground">3</span>
          </div>
          <Input
            value={streamUrl3}
            onChange={(e) => setStreamUrl3(e.target.value)}
            placeholder="Opción 3 (alternativo)..."
            className="text-sm h-9 flex-1"
          />
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !isModified}
            className="h-9 px-4"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" />
                Guardar Links
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
