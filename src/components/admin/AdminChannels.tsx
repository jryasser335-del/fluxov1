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
  stream_url_2: string | null;
  stream_url_3: string | null;
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
    stream_url_2: "",
    stream_url_3: "",
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
        stream_url_2: channel.stream_url_2,
        stream_url_3: channel.stream_url_3,
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
        stream_url_2: newChannel.stream_url_2 || null,
        stream_url_3: newChannel.stream_url_3 || null,
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
      setNewChannel({ key: "", name: "", logo: "", stream: "", stream_url_2: "", stream_url_3: "" });
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <Tv className="w-5 h-5 text-primary" />
            Gestionar Canales
          </h2>
          <p className="text-sm text-white/50 mt-1">{channels.length} canales configurados</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 shadow-lg shadow-primary/25">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Canal
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-black/95 border-white/10 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-white font-display">Nuevo Canal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Key (único)</Label>
                  <Input
                    placeholder="espn"
                    value={newChannel.key}
                    onChange={(e) => setNewChannel({ ...newChannel, key: e.target.value })}
                    className="bg-white/5 border-white/10 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Nombre</Label>
                  <Input
                    placeholder="ESPN"
                    value={newChannel.name}
                    onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                    className="bg-white/5 border-white/10 focus:border-primary"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Logo URL</Label>
                <Input
                  placeholder="https://..."
                  value={newChannel.logo}
                  onChange={(e) => setNewChannel({ ...newChannel, logo: e.target.value })}
                  className="bg-white/5 border-white/10 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70 flex items-center gap-2">
                  <LinkIcon className="w-3 h-3" />
                  Stream URL (Opción 1)
                </Label>
                <Input
                  placeholder="https://...m3u8"
                  value={newChannel.stream}
                  onChange={(e) => setNewChannel({ ...newChannel, stream: e.target.value })}
                  className="bg-white/5 border-white/10 focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Opción 2</Label>
                  <Input
                    placeholder="URL alternativa..."
                    value={newChannel.stream_url_2}
                    onChange={(e) => setNewChannel({ ...newChannel, stream_url_2: e.target.value })}
                    className="bg-white/5 border-white/10 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Opción 3</Label>
                  <Input
                    placeholder="URL alternativa..."
                    value={newChannel.stream_url_3}
                    onChange={(e) => setNewChannel({ ...newChannel, stream_url_3: e.target.value })}
                    className="bg-white/5 border-white/10 focus:border-primary"
                  />
                </div>
              </div>
              <Button onClick={addChannel} className="w-full bg-gradient-to-r from-primary to-purple-500">
                Crear Canal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Channels grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {channels.map((channel) => (
          <div
            key={channel.id}
            className="relative group overflow-hidden rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-primary/30 transition-all duration-300"
          >
            {/* Active indicator */}
            {channel.is_active && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-purple-500 to-pink-500" />
            )}
            
            <div className="p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center overflow-hidden">
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
                      <Tv className="w-6 h-6 text-white/40" />
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-white">{channel.name}</span>
                    <p className="text-xs text-white/40">{channel.key}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={channel.is_active}
                    onCheckedChange={(checked) => {
                      const updated = { ...channel, is_active: checked };
                      setChannels(channels.map((c) => c.id === channel.id ? updated : c));
                      updateChannel(updated);
                    }}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>

              {/* Inputs */}
              <div className="grid gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-white/50">Logo URL</Label>
                  <Input
                    value={channel.logo || ""}
                    onChange={(e) => setChannels(channels.map((c) => c.id === channel.id ? { ...c, logo: e.target.value } : c))}
                    placeholder="https://..."
                    className="text-sm bg-black/30 border-white/10"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-white/50 flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" />
                    Stream Principal
                  </Label>
                  <Input
                    value={channel.stream || ""}
                    onChange={(e) => setChannels(channels.map((c) => c.id === channel.id ? { ...c, stream: e.target.value } : c))}
                    placeholder="https://...m3u8"
                    className="text-sm bg-black/30 border-white/10"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-white/40">Opción 2</Label>
                    <Input
                      value={channel.stream_url_2 || ""}
                      onChange={(e) => setChannels(channels.map((c) => c.id === channel.id ? { ...c, stream_url_2: e.target.value } : c))}
                      placeholder="Alternativa..."
                      className="text-xs bg-black/30 border-white/10"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-white/40">Opción 3</Label>
                    <Input
                      value={channel.stream_url_3 || ""}
                      onChange={(e) => setChannels(channels.map((c) => c.id === channel.id ? { ...c, stream_url_3: e.target.value } : c))}
                      placeholder="Alternativa..."
                      className="text-xs bg-black/30 border-white/10"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteChannel(channel.id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => updateChannel(channel)}
                  disabled={saving === channel.id}
                  className="bg-white/10 hover:bg-white/20"
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
          </div>
        ))}
      </div>

      {channels.length === 0 && (
        <div className="relative flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Tv className="w-8 h-8 text-white/30" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">No hay canales</p>
            <p className="text-sm text-white/50">Agrega el primero para comenzar</p>
          </div>
        </div>
      )}
    </div>
  );
}
