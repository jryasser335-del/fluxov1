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
  thumbnail: string | null;
  is_live: boolean;
  is_active: boolean;
}

const LEAGUES = [
  { key: "nba", name: "NBA", sport: "Basketball" },
  { key: "nfl", name: "NFL", sport: "Football" },
  { key: "mlb", name: "MLB", sport: "Baseball" },
  { key: "nhl", name: "NHL", sport: "Hockey" },
  { key: "esp.1", name: "La Liga", sport: "Soccer" },
  { key: "eng.1", name: "Premier League", sport: "Soccer" },
  { key: "ger.1", name: "Bundesliga", sport: "Soccer" },
  { key: "ita.1", name: "Serie A", sport: "Soccer" },
  { key: "fra.1", name: "Ligue 1", sport: "Soccer" },
  { key: "mex.1", name: "Liga MX", sport: "Soccer" },
  { key: "usa.1", name: "MLS", sport: "Soccer" },
  { key: "uefa.champions", name: "Champions League", sport: "Soccer" },
  { key: "uefa.europa", name: "Europa League", sport: "Soccer" },
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

  const updateStreamUrl = async (event: EventLink, stream_url: string) => {
    setSaving(event.id);
    const { error } = await supabase
      .from("events")
      .update({ stream_url })
      .eq("id", event.id);

    if (error) {
      toast.error("Error al guardar link");
    } else {
      setEventLinks(eventLinks.map(e => e.id === event.id ? { ...e, stream_url } : e));
      toast.success("Link guardado");
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
            onUpdateStream={(url) => updateStreamUrl(event, url)}
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
  onUpdateStream: (url: string) => void;
  onToggleLive: (live: boolean) => void;
  onToggleActive: (active: boolean) => void;
  onDelete: () => void;
}

function EventRow({ event, saving, onUpdateStream, onToggleLive, onToggleActive, onDelete }: EventRowProps) {
  const [streamUrl, setStreamUrl] = useState(event.stream_url || "");
  const hasLink = Boolean(event.stream_url);
  const isModified = streamUrl !== (event.stream_url || "");

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

      {/* Stream URL Input Row */}
      <div className="flex items-center gap-2">
        <LinkIcon className="w-4 h-4 text-muted-foreground shrink-0" />
        <Input
          value={streamUrl}
          onChange={(e) => setStreamUrl(e.target.value)}
          placeholder="Pega el link del stream aquí..."
          className="text-sm h-9 flex-1"
        />
        <Button
          size="sm"
          onClick={() => onUpdateStream(streamUrl)}
          disabled={saving || !isModified}
          className="h-9 px-3"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4 mr-1" />
              Guardar
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
