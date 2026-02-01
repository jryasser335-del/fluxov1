import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchTMDB, TMDBResult } from "@/lib/api";
import { TMDB_IMG } from "@/lib/constants";
import { STREAMING_PLATFORMS, getPlatformLabel } from "@/lib/platforms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Plus, Save, Trash2, Loader2, Link as LinkIcon, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type MediaType = "movie" | "series" | "dorama";

interface MediaLink {
  id: string;
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  poster_path: string | null;
  stream_url: string;
  season: number | null;
  episode: number | null;
  is_active: boolean;
  platform: string | null;
}

interface AdminMediaProps {
  mediaType: MediaType;
  title: string;
}

export function AdminMedia({ mediaType, title }: AdminMediaProps) {
  const [mediaLinks, setMediaLinks] = useState<MediaLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TMDBResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<TMDBResult | null>(null);
  const [newLink, setNewLink] = useState({
    stream_url: "",
    season: "",
    episode: "",
    platform: "",
  });

  useEffect(() => {
    fetchMediaLinks();
  }, [mediaType]);

  const fetchMediaLinks = async () => {
    const { data, error } = await supabase
      .from("media_links")
      .select("*")
      .eq("media_type", mediaType)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Error al cargar links");
    } else {
      setMediaLinks((data as MediaLink[]) || []);
    }
    setLoading(false);
  };

  const searchTMDB = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const endpoint = mediaType === "movie" 
        ? `search/movie?query=${encodeURIComponent(searchQuery)}`
        : `search/tv?query=${encodeURIComponent(searchQuery)}`;
      
      const response = await fetchTMDB(endpoint);
      setSearchResults(response.results.slice(0, 10));
    } catch {
      toast.error("Error buscando en TMDB");
    }
    setSearching(false);
  };

  const selectMedia = (media: TMDBResult) => {
    setSelectedMedia(media);
    setSearchResults([]);
    setSearchQuery("");
  };

  const addMediaLink = async () => {
    if (!selectedMedia || !newLink.stream_url) {
      toast.error("Selecciona un título y agrega el link");
      return;
    }

    const { data, error } = await supabase
      .from("media_links")
      .insert({
        tmdb_id: selectedMedia.id,
        media_type: mediaType,
        title: selectedMedia.title || selectedMedia.name || "Sin título",
        poster_path: selectedMedia.poster_path,
        stream_url: newLink.stream_url,
        season: newLink.season ? parseInt(newLink.season) : null,
        episode: newLink.episode ? parseInt(newLink.episode) : null,
        platform: newLink.platform || null,
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes("duplicate")) {
        toast.error("Ya existe un link para este título");
      } else {
        toast.error("Error al agregar link");
      }
    } else {
      setMediaLinks([data as MediaLink, ...mediaLinks]);
      setSelectedMedia(null);
      setNewLink({ stream_url: "", season: "", episode: "", platform: "" });
      setIsDialogOpen(false);
      toast.success("Link agregado");
    }
  };

  const updateMediaLink = async (link: MediaLink) => {
    setSaving(link.id);
    const { error } = await supabase
      .from("media_links")
      .update({
        stream_url: link.stream_url,
        season: link.season,
        episode: link.episode,
        is_active: link.is_active,
        platform: link.platform,
      })
      .eq("id", link.id);

    if (error) {
      toast.error("Error al guardar");
    } else {
      toast.success("Link actualizado");
    }
    setSaving(null);
  };

  const deleteMediaLink = async (id: string) => {
    const { error } = await supabase.from("media_links").delete().eq("id", id);

    if (error) {
      toast.error("Error al eliminar");
    } else {
      setMediaLinks(mediaLinks.filter((l) => l.id !== id));
      toast.success("Link eliminado");
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
        <h2 className="text-lg font-semibold">Links de {title}</h2>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Agregar Link
        </Button>
      </div>

      {/* Add Link Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>Agregar Link - {title}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Search TMDB */}
            {!selectedMedia && (
              <div className="space-y-3">
                <Label>Buscar en TMDB</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={`Buscar ${title.toLowerCase()}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchTMDB()}
                  />
                  <Button onClick={searchTMDB} disabled={searching}>
                    {searching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        onClick={() => selectMedia(result)}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/10"
                      >
                        {result.poster_path ? (
                          <img
                            src={`${TMDB_IMG}${result.poster_path}`}
                            alt={result.title || result.name}
                            className="w-10 h-14 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-14 bg-muted rounded flex items-center justify-center text-xs">
                            N/A
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {result.title || result.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {result.release_date?.slice(0, 4) ||
                              result.first_air_date?.slice(0, 4) ||
                              "N/A"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Selected Media */}
            {selectedMedia && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                  {selectedMedia.poster_path ? (
                    <img
                      src={`${TMDB_IMG}${selectedMedia.poster_path}`}
                      alt={selectedMedia.title || selectedMedia.name}
                      className="w-12 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-16 bg-muted rounded" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">
                      {selectedMedia.title || selectedMedia.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      TMDB ID: {selectedMedia.id}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedMedia(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Stream URL *</Label>
                  <Input
                    placeholder="https://...m3u8"
                    value={newLink.stream_url}
                    onChange={(e) =>
                      setNewLink({ ...newLink, stream_url: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Plataforma</Label>
                  <Select
                    value={newLink.platform}
                    onValueChange={(value) =>
                      setNewLink({ ...newLink, platform: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona plataforma..." />
                    </SelectTrigger>
                    <SelectContent>
                      {STREAMING_PLATFORMS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {mediaType !== "movie" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Temporada</Label>
                      <Input
                        type="number"
                        placeholder="1"
                        value={newLink.season}
                        onChange={(e) =>
                          setNewLink({ ...newLink, season: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Episodio</Label>
                      <Input
                        type="number"
                        placeholder="1"
                        value={newLink.episode}
                        onChange={(e) =>
                          setNewLink({ ...newLink, episode: e.target.value })
                        }
                      />
                    </div>
                  </div>
                )}

                <Button onClick={addMediaLink} className="w-full">
                  Agregar Link
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Media Links List */}
      <div className="space-y-3">
        {mediaLinks.map((link) => (
          <div key={link.id} className="glass-panel rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              {link.poster_path ? (
                <img
                  src={`${TMDB_IMG}${link.poster_path}`}
                  alt={link.title}
                  className="w-12 h-16 object-cover rounded"
                />
              ) : (
                <div className="w-12 h-16 bg-muted rounded" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{link.title}</p>
                <p className="text-xs text-muted-foreground">
                  TMDB: {link.tmdb_id}
                  {link.season && ` • T${link.season}`}
                  {link.episode && `E${link.episode}`}
                  {link.platform && ` • ${getPlatformLabel(link.platform)}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    link.is_active
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {link.is_active ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <LinkIcon className="w-3 h-3" />
                  Stream URL
                </Label>
                <Input
                  value={link.stream_url}
                  onChange={(e) =>
                    setMediaLinks(
                      mediaLinks.map((l) =>
                        l.id === link.id ? { ...l, stream_url: e.target.value } : l
                      )
                    )
                  }
                  placeholder="https://...m3u8"
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Plataforma</Label>
                <Select
                  value={link.platform || ""}
                  onValueChange={(value) =>
                    setMediaLinks(
                      mediaLinks.map((l) =>
                        l.id === link.id ? { ...l, platform: value || null } : l
                      )
                    )
                  }
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Sin plataforma" />
                  </SelectTrigger>
                  <SelectContent>
                    {STREAMING_PLATFORMS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMediaLink(link.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => updateMediaLink(link)}
                disabled={saving === link.id}
              >
                {saving === link.id ? (
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

        {mediaLinks.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No hay links agregados. Busca un título y agrega su link de stream.
          </div>
        )}
      </div>
    </div>
  );
}
