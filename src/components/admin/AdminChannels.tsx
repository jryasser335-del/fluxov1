import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Save, Trash2, Loader2, Tv, Link as LinkIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Channel {
  id: string;
  key: string;
  name: string;
  logo: string | null;
  stream: string | null;
  is_active: boolean;
  sort_order: number;
}

export function AdminChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newChannel, setNewChannel] = useState({
    key: "",
    name: "",
    logo: "",
    stream: "",
  });

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    const { data, error } = await supabase
      .from("channels")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      toast.error("Error al cargar canales");
    } else {
      setChannels(data || []);
    }
    setLoading(false);
  };

  const updateChannel = async (channel: Channel) => {
    setSaving(channel.id);
    const { error } = await supabase
      .from("channels")
      .update({
        name: channel.name,
        logo: channel.logo,
        stream: channel.stream,
        is_active: channel.is_active,
      })
      .eq("id", channel.id);

    if (error) {
      toast.error("Error al guardar");
    } else {
      toast.success("Canal actualizado");
    }
    setSaving(null);
  };

  const deleteChannel = async (id: string) => {
    const { error } = await supabase.from("channels").delete().eq("id", id);

    if (error) {
      toast.error("Error al eliminar");
    } else {
      setChannels(channels.filter((c) => c.id !== id));
      toast.success("Canal eliminado");
    }
  };

  const addChannel = async () => {
    if (!newChannel.key || !newChannel.name) {
      toast.error("Key y nombre son requeridos");
      return;
    }

    const { data, error } = await supabase
      .from("channels")
      .insert({
        key: newChannel.key,
        name: newChannel.name,
        logo: newChannel.logo || null,
        stream: newChannel.stream || "",
        sort_order: channels.length + 1,
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes("duplicate")) {
        toast.error("Ya existe un canal con esa key");
      } else {
        toast.error("Error al crear canal");
      }
    } else {
      setChannels([...channels, data]);
      setNewChannel({ key: "", name: "", logo: "", stream: "" });
      setIsDialogOpen(false);
      toast.success("Canal creado");
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
        <h2 className="text-lg font-semibold">Gestionar Canales</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Canal
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Nuevo Canal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Key (único)</Label>
                <Input
                  placeholder="espn"
                  value={newChannel.key}
                  onChange={(e) =>
                    setNewChannel({ ...newChannel, key: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  placeholder="ESPN"
                  value={newChannel.name}
                  onChange={(e) =>
                    setNewChannel({ ...newChannel, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input
                  placeholder="https://..."
                  value={newChannel.logo}
                  onChange={(e) =>
                    setNewChannel({ ...newChannel, logo: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Stream URL</Label>
                <Input
                  placeholder="https://...m3u8"
                  value={newChannel.stream}
                  onChange={(e) =>
                    setNewChannel({ ...newChannel, stream: e.target.value })
                  }
                />
              </div>
              <Button onClick={addChannel} className="w-full">
                Crear Canal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {channels.map((channel) => (
          <div
            key={channel.id}
            className="glass-panel rounded-xl p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-black/30 border border-white/10 flex items-center justify-center overflow-hidden">
                  {channel.logo ? (
                    <img
                      src={channel.logo}
                      alt={channel.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <Tv className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <span className="font-semibold">{channel.name}</span>
                  <span className="text-muted-foreground text-xs ml-2">
                    ({channel.key})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={channel.is_active}
                    onCheckedChange={(checked) => {
                      const updated = { ...channel, is_active: checked };
                      setChannels(
                        channels.map((c) =>
                          c.id === channel.id ? updated : c
                        )
                      );
                      updateChannel(updated);
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {channel.is_active ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Logo URL
                </Label>
                <Input
                  value={channel.logo || ""}
                  onChange={(e) =>
                    setChannels(
                      channels.map((c) =>
                        c.id === channel.id
                          ? { ...c, logo: e.target.value }
                          : c
                      )
                    )
                  }
                  placeholder="https://..."
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <LinkIcon className="w-3 h-3" />
                  Stream URL
                </Label>
                <Input
                  value={channel.stream || ""}
                  onChange={(e) =>
                    setChannels(
                      channels.map((c) =>
                        c.id === channel.id
                          ? { ...c, stream: e.target.value }
                          : c
                      )
                    )
                  }
                  placeholder="https://...m3u8"
                  className="text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteChannel(channel.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => updateChannel(channel)}
                disabled={saving === channel.id}
              >
                {saving === channel.id ? (
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

        {channels.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No hay canales. Agrega el primero.
          </div>
        )}
      </div>
    </div>
  );
}
