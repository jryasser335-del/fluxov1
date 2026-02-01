import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Save, Trash2, Loader2, Link as LinkIcon, Calendar } from "lucide-react";
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
    description: "",
    event_date: "",
    sport: "",
    league: "",
    team_home: "",
    team_away: "",
    stream_url: "",
    thumbnail: "",
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
        description: newEvent.description || null,
        event_date: newEvent.event_date,
        sport: newEvent.sport || null,
        league: newEvent.league || null,
        team_home: newEvent.team_home || null,
        team_away: newEvent.team_away || null,
        stream_url: newEvent.stream_url || null,
        thumbnail: newEvent.thumbnail || null,
      })
      .select()
      .single();

    if (error) {
      toast.error("Error al crear evento");
    } else {
      setEvents([...events, data]);
      setNewEvent({
        name: "",
        description: "",
        event_date: "",
        sport: "",
        league: "",
        team_home: "",
        team_away: "",
        stream_url: "",
        thumbnail: "",
      });
      setIsDialogOpen(false);
      toast.success("Evento creado");
    }
  };

  const updateEvent = async (event: Event) => {
    setSaving(event.id);
    const { error } = await supabase
      .from("events")
      .update({
        name: event.name,
        description: event.description,
        event_date: event.event_date,
        sport: event.sport,
        league: event.league,
        team_home: event.team_home,
        team_away: event.team_away,
        stream_url: event.stream_url,
        thumbnail: event.thumbnail,
        is_live: event.is_live,
        is_active: event.is_active,
      })
      .eq("id", event.id);

    if (error) {
      toast.error("Error al guardar");
    } else {
      toast.success("Evento actualizado");
    }
    setSaving(null);
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
              Agregar Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Equipo Local</Label>
                  <Input
                    placeholder="Lakers"
                    value={newEvent.team_home}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, team_home: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Equipo Visitante</Label>
                  <Input
                    placeholder="Warriors"
                    value={newEvent.team_away}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, team_away: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Stream URL</Label>
                <Input
                  placeholder="https://...m3u8"
                  value={newEvent.stream_url}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, stream_url: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Thumbnail URL</Label>
                <Input
                  placeholder="https://..."
                  value={newEvent.thumbnail}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, thumbnail: e.target.value })
                  }
                />
              </div>

              <Button onClick={addEvent} className="w-full">
                Crear Evento
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {events.map((event) => (
          <div key={event.id} className="glass-panel rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <span className="font-semibold">{event.name}</span>
                  <div className="text-xs text-muted-foreground">
                    {new Date(event.event_date).toLocaleString("es-ES")}
                    {event.league && ` • ${event.league}`}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={event.is_live}
                    onCheckedChange={(checked) => {
                      const updated = { ...event, is_live: checked };
                      setEvents(events.map((e) => (e.id === event.id ? updated : e)));
                      updateEvent(updated);
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {event.is_live ? "🔴 EN VIVO" : "Programado"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Equipo Local
                </Label>
                <Input
                  value={event.team_home || ""}
                  onChange={(e) =>
                    setEvents(
                      events.map((ev) =>
                        ev.id === event.id ? { ...ev, team_home: e.target.value } : ev
                      )
                    )
                  }
                  placeholder="Equipo local"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Equipo Visitante
                </Label>
                <Input
                  value={event.team_away || ""}
                  onChange={(e) =>
                    setEvents(
                      events.map((ev) =>
                        ev.id === event.id ? { ...ev, team_away: e.target.value } : ev
                      )
                    )
                  }
                  placeholder="Equipo visitante"
                  className="text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <LinkIcon className="w-3 h-3" />
                Stream URL
              </Label>
              <Input
                value={event.stream_url || ""}
                onChange={(e) =>
                  setEvents(
                    events.map((ev) =>
                      ev.id === event.id ? { ...ev, stream_url: e.target.value } : ev
                    )
                  )
                }
                placeholder="https://...m3u8"
                className="text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteEvent(event.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => updateEvent(event)}
                disabled={saving === event.id}
              >
                {saving === event.id ? (
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
