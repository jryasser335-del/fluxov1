import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Save, Trash2, Loader2, Link as LinkIcon, Calendar, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Event {
  id: string;
  name: string;
  description: string | null;
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

export function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: "",
    event_date: "",
    sport: "",
    league: "",
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true });

    if (error) {
      toast.error("Error al cargar eventos");
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  const addEvent = async () => {
    if (!newEvent.name || !newEvent.event_date) {
      toast.error("Nombre y fecha son requeridos");
      return;
    }

    const { data, error } = await supabase
      .from("events")
      .insert({
        name: newEvent.name,
        event_date: newEvent.event_date,
        sport: newEvent.sport || null,
        league: newEvent.league || null,
      })
      .select()
      .single();

    if (error) {
      toast.error("Error al crear evento");
    } else {
      setEvents([...events, data]);
      setNewEvent({
        name: "",
        event_date: "",
        sport: "",
        league: "",
      });
      setIsDialogOpen(false);
      toast.success("Evento creado");
    }
  };

  const updateStreamUrl = async (event: Event, stream_url: string) => {
    setSaving(event.id);
    const { error } = await supabase
      .from("events")
      .update({ stream_url })
      .eq("id", event.id);

    if (error) {
      toast.error("Error al guardar link");
    } else {
      setEvents(events.map((e) => (e.id === event.id ? { ...e, stream_url } : e)));
      toast.success("Link guardado");
    }
    setSaving(null);
  };

  const toggleLive = async (event: Event, is_live: boolean) => {
    const { error } = await supabase
      .from("events")
      .update({ is_live })
      .eq("id", event.id);

    if (error) {
      toast.error("Error al cambiar estado");
    } else {
      setEvents(events.map((e) => (e.id === event.id ? { ...e, is_live } : e)));
    }
  };

  const toggleActive = async (event: Event, is_active: boolean) => {
    const { error } = await supabase
      .from("events")
      .update({ is_active })
      .eq("id", event.id);

    if (error) {
      toast.error("Error al cambiar estado");
    } else {
      setEvents(events.map((e) => (e.id === event.id ? { ...e, is_active } : e)));
    }
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase.from("events").delete().eq("id", id);

    if (error) {
      toast.error("Error al eliminar");
    } else {
      setEvents(events.filter((e) => e.id !== id));
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
        <h2 className="text-lg font-semibold">Gestionar Eventos</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle>Nuevo Evento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  placeholder="Lakers vs Warriors"
                  value={newEvent.name}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, name: e.target.value })
                  }
                />
              </div>
              
              <div className="space-y-2">
                <Label>Fecha y Hora *</Label>
                <Input
                  type="datetime-local"
                  value={newEvent.event_date}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, event_date: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Deporte</Label>
                  <Input
                    placeholder="Basketball"
                    value={newEvent.sport}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, sport: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Liga</Label>
                  <Input
                    placeholder="NBA"
                    value={newEvent.league}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, league: e.target.value })
                    }
                  />
                </div>
              </div>

              <Button onClick={addEvent} className="w-full">
                Crear Evento
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Events List - Focused on Links */}
      <div className="space-y-2">
        {events.map((event) => (
          <EventRow
            key={event.id}
            event={event}
            saving={saving === event.id}
            onUpdateStream={(url) => updateStreamUrl(event, url)}
            onToggleLive={(live) => toggleLive(event, live)}
            onToggleActive={(active) => toggleActive(event, active)}
            onDelete={() => deleteEvent(event.id)}
          />
        ))}

        {events.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No hay eventos. Agrega el primero.
          </div>
        )}
      </div>
    </div>
  );
}

interface EventRowProps {
  event: Event;
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
    <div className={`glass-panel rounded-xl p-3 flex flex-col gap-3 ${!event.is_active ? 'opacity-50' : ''}`}>
      {/* Header Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status indicator */}
        <div className={`w-2 h-2 rounded-full ${event.is_live ? 'bg-red-500 animate-pulse' : hasLink ? 'bg-green-500' : 'bg-yellow-500'}`} />
        
        {/* Event info */}
        <div className="flex-1 min-w-[200px]">
          <div className="font-medium text-sm">{event.name}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Calendar className="w-3 h-3" />
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
