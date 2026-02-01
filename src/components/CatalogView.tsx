import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Section } from "./Section";
import { Chips } from "./Chips";
import { SkeletonGrid } from "./Skeleton";
import { CatalogCard } from "./CatalogCard";
import { STREAMING_PLATFORMS } from "@/lib/platforms";

interface MediaLink {
  id: string;
  tmdb_id: number;
  media_type: "movie" | "series" | "dorama";
  title: string;
  poster_path: string | null;
  stream_url: string;
  season: number | null;
  episode: number | null;
  platform: string | null;
  is_active: boolean;
}

const TYPE_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "movie", label: "Películas" },
  { value: "series", label: "Series" },
  { value: "dorama", label: "Doramas" },
];

const PLATFORM_FILTERS = [
  { value: "all", label: "Todas" },
  ...STREAMING_PLATFORMS.map((p) => ({ value: p.value, label: p.label })),
];

interface CatalogViewProps {
  searchQuery: string;
}

export function CatalogView({ searchQuery }: CatalogViewProps) {
  const [type, setType] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [mediaLinks, setMediaLinks] = useState<MediaLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCatalog();
  }, []);

  const fetchCatalog = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("media_links")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMediaLinks(data as MediaLink[]);
    }
    setLoading(false);
  };

  const handleTypeChange = (newType: string) => {
    setType(newType);
  };

  const handlePlatformChange = (newPlatform: string) => {
    setPlatform(newPlatform);
  };

  // Group by tmdb_id to show unique titles (for series with multiple episodes)
  const groupedMedia = useMemo(() => {
    const groups = new Map<string, MediaLink[]>();
    
    mediaLinks.forEach((link) => {
      const key = `${link.media_type}-${link.tmdb_id}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(link);
    });
    
    return groups;
  }, [mediaLinks]);

  // Filter and create display list
  const filteredMedia = useMemo(() => {
    const result: { link: MediaLink; episodes: MediaLink[] }[] = [];
    
    groupedMedia.forEach((episodes, key) => {
      const firstEp = episodes[0];
      
      // Filter by type
      if (type !== "all" && firstEp.media_type !== type) return;
      
      // Filter by platform
      if (platform !== "all" && firstEp.platform !== platform) return;
      
      // Filter by search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!firstEp.title.toLowerCase().includes(q)) return;
      }
      
      result.push({ link: firstEp, episodes });
    });
    
    return result;
  }, [groupedMedia, type, platform, searchQuery]);

  const badge = loading
    ? "Cargando…"
    : `${filteredMedia.length} títulos disponibles`;

  return (
    <Section title="Mi Catálogo" emoji="📚" badge={badge}>
      <div className="flex flex-wrap gap-4 mb-2">
        <Chips options={TYPE_FILTERS} value={type} onChange={handleTypeChange} />
        <Chips options={PLATFORM_FILTERS} value={platform} onChange={handlePlatformChange} />
      </div>

      {loading ? (
        <SkeletonGrid count={12} />
      ) : filteredMedia.length === 0 ? (
        <div className="text-muted-foreground text-sm py-8 text-center">
          No hay contenido agregado. Ve al panel Admin para agregar películas, series y doramas.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
          {filteredMedia.map(({ link, episodes }) => (
            <CatalogCard 
              key={`${link.media_type}-${link.tmdb_id}`}
              item={link}
              episodes={episodes}
            />
          ))}
        </div>
      )}
    </Section>
  );
}
